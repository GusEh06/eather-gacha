import type { Db } from "mongodb"
import {
  espiralMissionProgressCol,
  usersCol,
  type EspiralMissionProgressDoc,
} from "../db/collections"
import { recordEcosTransaction } from "./ecosTransactions"
import {
  ESPIRAL_MISSIONS,
  periodKeyFor,
  type EspiralMissionDef,
} from "../../../../packages/shared/src/espiral"

/**
 * Misiones de La Espiral — reset perezoso por periodKey ("2026-07-11" diario,
 * "2026-W28" semanal), sin cron: cada periodo nuevo simplemente crea/usa un
 * doc distinto, los viejos quedan como historial.
 */

async function getOrCreatePeriodDoc(
  db: Db,
  clerkId: string,
  periodKey: string
): Promise<EspiralMissionProgressDoc> {
  const col = espiralMissionProgressCol(db)
  const existing = await col.findOne({ userId: clerkId, periodKey })
  if (existing) return existing
  const doc: EspiralMissionProgressDoc = {
    userId: clerkId,
    periodKey,
    metrics: { floors_cleared: 0, max_floor_reached: 0, bosses_defeated: 0 },
    claimedMissionIds: [],
    updatedAt: new Date(),
  }
  await col.insertOne(doc)
  return doc
}

/**
 * Acumula métricas de misiones tras limpiar un piso. Nunca lanza — las
 * misiones jamás deben romper un run.
 */
export async function recordMissionMetrics(
  db: Db,
  clerkId: string,
  delta: { floors_cleared: number; max_floor_reached: number; bosses_defeated: number }
): Promise<void> {
  try {
    const col = espiralMissionProgressCol(db)
    const now = new Date()
    for (const period of ["daily", "weekly"] as const) {
      const periodKey = periodKeyFor(period, now)
      await getOrCreatePeriodDoc(db, clerkId, periodKey)
      await col.updateOne(
        { userId: clerkId, periodKey },
        {
          $inc: {
            "metrics.floors_cleared": delta.floors_cleared,
            "metrics.bosses_defeated": delta.bosses_defeated,
          },
          $max: { "metrics.max_floor_reached": delta.max_floor_reached },
          $set: { updatedAt: now },
        }
      )
    }
  } catch (err) {
    console.error("[espiralMissions] failed to record metrics:", err)
  }
}

export interface MissionView {
  id: string
  period: "daily" | "weekly"
  descripcion: string
  target: number
  rewardEcos: number
  progress: number
  completed: boolean
  claimed: boolean
}

/** GET /espiral/missions — estado de misiones del periodo actual. */
export async function getMissions(db: Db, clerkId: string): Promise<MissionView[]> {
  const now = new Date()
  const dailyDoc = await getOrCreatePeriodDoc(db, clerkId, periodKeyFor("daily", now))
  const weeklyDoc = await getOrCreatePeriodDoc(db, clerkId, periodKeyFor("weekly", now))

  return ESPIRAL_MISSIONS.map((m) => {
    const doc = m.period === "daily" ? dailyDoc : weeklyDoc
    const progress = doc.metrics[m.metric] ?? 0
    return {
      id: m.id,
      period: m.period,
      descripcion: m.descripcion,
      target: m.target,
      rewardEcos: m.rewardEcos,
      progress: Math.min(progress, m.target),
      completed: progress >= m.target,
      claimed: doc.claimedMissionIds.includes(m.id),
    }
  })
}

export class MissionError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** POST /espiral/missions/:id/claim — acredita Ecos si la misión está completa. */
export async function claimMission(
  db: Db,
  clerkId: string,
  missionId: string
): Promise<{ rewardEcos: number; ecos: number }> {
  const mission: EspiralMissionDef | undefined = ESPIRAL_MISSIONS.find((m) => m.id === missionId)
  if (!mission) throw new MissionError("Unknown mission", 404)

  const now = new Date()
  const periodKey = periodKeyFor(mission.period, now)
  const doc = await getOrCreatePeriodDoc(db, clerkId, periodKey)

  if (doc.claimedMissionIds.includes(mission.id)) {
    throw new MissionError("Mission already claimed this period", 409)
  }
  if ((doc.metrics[mission.metric] ?? 0) < mission.target) {
    throw new MissionError("Mission not completed yet", 409)
  }

  // Marcar como reclamada de forma atómica — si otro request la reclamó
  // primero, matchedCount será 0 y no acreditamos dos veces.
  const marked = await espiralMissionProgressCol(db).updateOne(
    { userId: clerkId, periodKey, claimedMissionIds: { $ne: mission.id } },
    { $push: { claimedMissionIds: mission.id }, $set: { updatedAt: now } }
  )
  if (marked.modifiedCount === 0) {
    throw new MissionError("Mission already claimed this period", 409)
  }

  const updated = await usersCol(db).findOneAndUpdate(
    { clerkId },
    { $inc: { ecos: mission.rewardEcos } },
    { returnDocument: "after" }
  )
  const balance = updated?.ecos ?? mission.rewardEcos

  await recordEcosTransaction(db, {
    userId: clerkId,
    type: "mission",
    amount: mission.rewardEcos,
    balanceAfter: balance,
    description: `Misión completada: ${mission.descripcion}`,
  })

  return { rewardEcos: mission.rewardEcos, ecos: balance }
}
