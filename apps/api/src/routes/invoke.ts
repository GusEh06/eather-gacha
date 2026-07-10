import { Hono } from "hono"
import { authMiddleware } from "../middleware/auth"
import { rateLimit } from "../middleware/rateLimit"
import { getDb } from "../db/client"
import { performInvoke, InvokeError } from "../services/invokeService"

const invokeRoutes = new Hono()

// P-01: máximo 10 invocaciones por minuto por usuario
const invokeRateLimit = rateLimit({ name: "invoke", max: 10, windowMs: 60_000 })

invokeRoutes.post("/", authMiddleware, invokeRateLimit, async (c) => {
  const clerkId = c.get("userId") as string

  let body: { mode?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }

  const mode = body.mode
  if (mode !== "x1" && mode !== "x10") {
    return c.json({ error: "mode must be 'x1' or 'x10'" }, 400)
  }

  try {
    const db = await getDb()
    const result = await performInvoke(db, clerkId, mode, c)
    return c.json(result)
  } catch (err) {
    if (err instanceof InvokeError) {
      return c.json({ error: err.message, ...err.extra }, err.status as 402 | 404)
    }
    console.error("[invoke] error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

export default invokeRoutes
