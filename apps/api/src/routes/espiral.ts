import { Hono, type Context } from "hono"
import { authMiddleware } from "../middleware/auth"
import { rateLimit } from "../middleware/rateLimit"
import { getDb } from "../db/client"
import {
  EspiralError,
  advanceFloor,
  advanceFloorManual,
  combatAction,
  getEspiralState,
  retreat,
  reviveRun,
  startRun,
} from "../services/espiralService"
import type { EspiralPlayerAction } from "../../../../packages/shared/src/espiral"
import { MissionError, claimMission, getMissions } from "../services/espiralMissions"

const espiralRoutes = new Hono()

// Advance es la llamada caliente del juego: 1 piso por request.
const advanceRateLimit = rateLimit({ name: "espiral-advance", max: 30, windowMs: 60_000 })
const startRateLimit = rateLimit({ name: "espiral-start", max: 10, windowMs: 60_000 })

function handleError(err: unknown, c: Context) {
  if (err instanceof EspiralError || err instanceof MissionError) {
    const extra = err instanceof EspiralError ? err.extra : undefined
    return c.json({ error: err.message, ...extra }, err.status as 400)
  }
  console.error("[espiral] error:", err)
  return c.json({ error: "Internal error" }, 500)
}

// GET /espiral/state — energía fresca (regen perezosa), checkpoint, run activo
espiralRoutes.get("/state", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string
  try {
    const db = await getDb()
    return c.json(await getEspiralState(db, clerkId))
  } catch (err) {
    return handleError(err, c)
  }
})

// POST /espiral/run/start — body { teamUserEntityIds: string[3] }
espiralRoutes.post("/run/start", authMiddleware, startRateLimit, async (c) => {
  const clerkId = c.get("userId") as string
  let body: { teamUserEntityIds?: string[] }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }
  try {
    const db = await getDb()
    return c.json(await startRun(db, clerkId, body.teamUserEntityIds ?? [], c))
  } catch (err) {
    return handleError(err, c)
  }
})

// POST /espiral/run/advance — resuelve el siguiente piso, server-authoritative.
// body opcional { mode: "manual" } abre el combate por turnos interactivos.
espiralRoutes.post("/run/advance", authMiddleware, advanceRateLimit, async (c) => {
  const clerkId = c.get("userId") as string
  let mode: string | undefined
  try {
    const body = (await c.req.json().catch(() => ({}))) as { mode?: string }
    mode = body.mode
  } catch {
    mode = undefined
  }
  try {
    const db = await getDb()
    if (mode === "manual") {
      return c.json(await advanceFloorManual(db, clerkId, c))
    }
    return c.json(await advanceFloor(db, clerkId, c))
  } catch (err) {
    return handleError(err, c)
  }
})

// POST /espiral/run/action — body { actorId, action } · un turno del combate manual
const actionRateLimit = rateLimit({ name: "espiral-action", max: 60, windowMs: 60_000 })
espiralRoutes.post("/run/action", authMiddleware, actionRateLimit, async (c) => {
  const clerkId = c.get("userId") as string
  let body: { actorId?: string; action?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }
  if (!body.actorId || !body.action) {
    return c.json({ error: "actorId and action are required" }, 400)
  }
  try {
    const db = await getDb()
    return c.json(await combatAction(db, clerkId, body.actorId, body.action as EspiralPlayerAction, c))
  } catch (err) {
    return handleError(err, c)
  }
})

// POST /espiral/run/retreat — banca lo ganado y termina el run
espiralRoutes.post("/run/retreat", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string
  try {
    const db = await getDb()
    return c.json(await retreat(db, clerkId, c))
  } catch (err) {
    return handleError(err, c)
  }
})

// POST /espiral/run/revive — paga Ecos para resucitar dentro de la ventana
espiralRoutes.post("/run/revive", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string
  try {
    const db = await getDb()
    return c.json(await reviveRun(db, clerkId, c))
  } catch (err) {
    return handleError(err, c)
  }
})

// GET /espiral/missions — misiones del periodo actual con progreso
espiralRoutes.get("/missions", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string
  try {
    const db = await getDb()
    return c.json({ missions: await getMissions(db, clerkId) })
  } catch (err) {
    return handleError(err, c)
  }
})

// POST /espiral/missions/:id/claim — acredita la recompensa en Ecos
espiralRoutes.post("/missions/:id/claim", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string
  const missionId = c.req.param("id") ?? ""
  try {
    const db = await getDb()
    return c.json(await claimMission(db, clerkId, missionId))
  } catch (err) {
    return handleError(err, c)
  }
})

export default espiralRoutes
