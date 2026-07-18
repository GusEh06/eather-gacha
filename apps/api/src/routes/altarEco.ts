import { Hono } from "hono"
import { authMiddleware } from "../middleware/auth"
import { rateLimit } from "../middleware/rateLimit"
import { getDb } from "../db/client"
import { usersCol } from "../db/collections"
import { AltarEcoError, performAltarEcoPull } from "../services/espiralGacha"
import {
  ALTAR_ECO_BASE_PROB,
  ALTAR_ECO_COST_X1,
  ALTAR_ECO_COST_X10,
  ALTAR_ECO_HARD_PITY,
} from "../../../../packages/shared/src/espiral"

const altarEcoRoutes = new Hono()

const pullRateLimit = rateLimit({ name: "altar-eco", max: 10, windowMs: 60_000 })

// GET /altar-eco/state — balance de Ecos, pity y parámetros del banner
altarEcoRoutes.get("/state", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string
  try {
    const db = await getDb()
    const user = await usersCol(db).findOne({ clerkId })
    if (!user) return c.json({ error: "User not found" }, 404)
    return c.json({
      ecos: user.ecos ?? 0,
      espiralPityCounter: user.espiralPityCounter ?? 0,
      hardPityAt: ALTAR_ECO_HARD_PITY + 1,
      costX1: ALTAR_ECO_COST_X1,
      costX10: ALTAR_ECO_COST_X10,
      probabilities: ALTAR_ECO_BASE_PROB,
    })
  } catch (err) {
    console.error("[altar-eco] state error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// POST /altar-eco/pull — body { mode: "x1" | "x10" }
altarEcoRoutes.post("/pull", authMiddleware, pullRateLimit, async (c) => {
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
    const result = await performAltarEcoPull(db, clerkId, mode, c)
    return c.json(result)
  } catch (err) {
    if (err instanceof AltarEcoError) {
      return c.json({ error: err.message, ...err.extra }, err.status as 402 | 404)
    }
    console.error("[altar-eco] pull error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

export default altarEcoRoutes
