import { verifyToken } from "@clerk/backend"
import type { Context, Next } from "hono"

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
    await next()
  } catch (err) {
    console.error("[auth] verifyToken failed:", err)
    return c.json({ error: "Invalid or expired token" }, 401)
  }
}
