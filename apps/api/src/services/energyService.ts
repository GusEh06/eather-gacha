import type { Db } from "mongodb"
import { usersCol, type UserDoc } from "../db/collections"
import {
  ESPIRAL_ENERGY_MAX,
  ESPIRAL_ENERGY_REGEN_MS,
} from "../../../../packages/shared/src/espiral"

/**
 * Regeneración perezosa de energía por timestamp — nunca un cron.
 * Avanza lastRegenAt solo por los ticks consumidos (no a "now") para no
 * perder el progreso fraccional hacia el siguiente punto.
 */
export function computeEnergy(
  current: number,
  lastRegenAt: Date,
  now: Date,
  cap: number = ESPIRAL_ENERGY_MAX,
  regenMs: number = ESPIRAL_ENERGY_REGEN_MS
): { energy: number; lastRegenAt: Date } {
  if (current >= cap) return { energy: current, lastRegenAt: now }
  const elapsed = now.getTime() - lastRegenAt.getTime()
  const ticks = Math.floor(elapsed / regenMs)
  if (ticks <= 0) return { energy: current, lastRegenAt }
  const energy = Math.min(cap, current + ticks)
  // Si llegamos al cap, anclamos a "now"; si no, avanzamos solo los ticks usados.
  const newAnchor =
    energy >= cap ? now : new Date(lastRegenAt.getTime() + ticks * regenMs)
  return { energy, lastRegenAt: newAnchor }
}

/**
 * Lee al usuario, aplica la regeneración perezosa y persiste el resultado.
 * Devuelve el doc actualizado con energía fresca (inicializa campos si faltan).
 */
export async function refreshEnergy(db: Db, clerkId: string): Promise<UserDoc | null> {
  const users = usersCol(db)
  const user = await users.findOne({ clerkId })
  if (!user) return null

  const now = new Date()
  const current = user.energyCurrent ?? ESPIRAL_ENERGY_MAX
  const anchor = user.energyLastRegenAt ?? now
  const { energy, lastRegenAt } = computeEnergy(current, anchor, now)

  if (energy !== user.energyCurrent || lastRegenAt !== user.energyLastRegenAt) {
    await users.updateOne(
      { clerkId },
      { $set: { energyCurrent: energy, energyLastRegenAt: lastRegenAt } }
    )
  }
  return { ...user, energyCurrent: energy, energyLastRegenAt: lastRegenAt }
}

/**
 * Deducción atómica de energía (mismo patrón que performInvoke con shards).
 * Debe llamarse DESPUÉS de refreshEnergy para que el balance esté fresco.
 * Devuelve la energía restante, o null si no alcanza.
 */
export async function spendEnergy(db: Db, clerkId: string, cost: number): Promise<number | null> {
  const users = usersCol(db)
  const updated = await users.findOneAndUpdate(
    { clerkId, energyCurrent: { $gte: cost } },
    { $inc: { energyCurrent: -cost } },
    { returnDocument: "after" }
  )
  return updated ? (updated.energyCurrent ?? 0) : null
}
