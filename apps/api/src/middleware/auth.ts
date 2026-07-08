import { verifyToken } from "@clerk/backend"
import type { Context, Next } from "hono"
import { getDb } from "../db/client"
import { usersCol } from "../db/collections"

export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const token = authHeader.replace("Bearer ", "")

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY ?? "",
      authorizedParties: ["http://localhost:3000", process.env.APP_URL ?? ""].filter(Boolean),
    })
    c.set("userId", payload.sub)
  } catch (err) {
    console.error("[auth] verifyToken failed:", err)
    return c.json({ error: "Invalid or expired token" }, 401)
  }

  // P-05: bloquear cuentas suspendidas en todos los endpoints autenticados.
  // La suspensión expira automáticamente al pasar suspendedUntil.
  try {
    const db = await getDb()
    const user = await usersCol(db).findOne(
      { clerkId: c.get("userId") as string },
      { projection: { suspendedUntil: 1, suspensionReason: 1 } }
    )
    if (user?.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      return c.json(
        {
          error: "Account suspended",
          reason: user.suspensionReason ?? "Terms of service violation",
          suspendedUntil: user.suspendedUntil,
        },
        403
      )
    }
  } catch (err) {
    // Si la DB no responde dejamos pasar: la suspensión es una capa extra,
    // no debe convertir una caída de Mongo en un lockout global.
    console.error("[auth] suspension check failed:", err)
  }

  await next()
}
