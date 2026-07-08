import { verifyToken, createClerkClient } from "@clerk/backend"
import type { Context, Next, MiddlewareHandler } from "hono"
import { getDb } from "../db/client"
import { usersCol, type UserRole } from "../db/collections"

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

/**
 * P-18: autorización por rol mínimo. Jerarquía: binder < moderator < admin.
 * Los roles viven en el documento Mongo del usuario (campo roles: string[]).
 * Compatibilidad: un usuario con publicMetadata.role === "admin" en Clerk
 * también cuenta como admin (mecanismo original del back office).
 */
const ROLE_RANK: Record<UserRole, number> = { binder: 0, moderator: 1, admin: 2 }

export async function resolveUserRole(clerkId: string): Promise<UserRole> {
  let best: UserRole = "binder"

  try {
    const db = await getDb()
    const user = await usersCol(db).findOne(
      { clerkId },
      { projection: { roles: 1 } }
    )
    for (const r of user?.roles ?? []) {
      if (ROLE_RANK[r] !== undefined && ROLE_RANK[r] > ROLE_RANK[best]) best = r
    }
  } catch (err) {
    console.error("[roles] mongo role lookup failed:", err)
  }

  if (best !== "admin") {
    try {
      const clerkUser = await clerk.users.getUser(clerkId)
      if (clerkUser.publicMetadata?.role === "admin") best = "admin"
    } catch (err) {
      console.error("[roles] clerk metadata lookup failed:", err)
    }
  }

  return best
}

export function requireRole(minRole: UserRole): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    const token = authHeader.replace("Bearer ", "")

    let clerkId: string
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY ?? "",
        authorizedParties: ["http://localhost:3000", process.env.APP_URL ?? ""].filter(Boolean),
      })
      clerkId = payload.sub
    } catch (err) {
      console.error("[roles] auth failed:", err)
      return c.json({ error: "Invalid or expired token" }, 401)
    }

    const role = await resolveUserRole(clerkId)
    if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
      console.warn(`[roles] ${clerkId} (${role}) attempted an action requiring ${minRole}`)
      return c.json({ error: `Forbidden: requires ${minRole} role` }, 403)
    }

    c.set("userId", clerkId)
    c.set("userRole", role)
    await next()
  }
}
