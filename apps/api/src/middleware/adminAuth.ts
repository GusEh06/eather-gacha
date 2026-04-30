import { verifyToken, createClerkClient } from "@clerk/backend"
import type { Context, Next } from "hono"

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

export async function adminMiddleware(c: Context, next: Next): Promise<Response | void> {
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
    
    // Fetch the user to check publicMetadata
    const user = await clerk.users.getUser(payload.sub)
    if (user.publicMetadata?.role !== "admin") {
      console.warn(`[admin] User ${payload.sub} attempted to access admin route without admin role.`)
      return c.json({ error: "Forbidden: Admins only" }, 403)
    }

    c.set("userId", payload.sub)
    await next()
  } catch (err) {
    console.error("[admin] auth failed:", err)
    return c.json({ error: "Invalid or expired token" }, 401)
  }
}
