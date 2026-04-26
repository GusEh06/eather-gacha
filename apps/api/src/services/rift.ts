import type { Db } from "mongodb"
import { entitiesCol, riftRotationCol, type RiftRotationDoc } from "../db/collections"

// Direct-buy prices per rarity in the Rift shop (matches PRD §6 + RIFT_PRICES in shared/types)
const RIFT_PRICES: Record<string, number> = {
  comet: 200,
  nova: 500,
  pulsar: 1200,
  eclipse: 4000,
  singularity: 8000,
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]!
}

function getNextMidnight(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  )
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** Generate (and store) a fresh Rift rotation for today.
 *  Uses $setOnInsert so concurrent calls are idempotent. */
export async function generateRiftRotation(db: Db): Promise<RiftRotationDoc> {
  const today = getTodayDate()
  const expiresAt = getNextMidnight()

  const riftEntities = await entitiesCol(db).find({ disponibleRift: true }).toArray()
  const picked = shuffle(riftEntities).slice(0, 5)

  const rotation: RiftRotationDoc = {
    date: today,
    slots: picked.map((e) => ({
      entityId: e._id!,
      priceShards: RIFT_PRICES[e.rareza] ?? 200,
      sold: false,
    })),
    expiresAt,
  }

  // Upsert: only insert if no doc for today already exists
  await riftRotationCol(db).updateOne(
    { date: today },
    { $setOnInsert: rotation },
    { upsert: true }
  )

  // Always return whatever is actually stored
  const stored = await riftRotationCol(db).findOne({ date: today })
  return stored ?? rotation
}

/** Return today's rotation, generating one if it doesn't exist yet. */
export async function getCurrentRiftRotation(db: Db): Promise<RiftRotationDoc> {
  const today = getTodayDate()
  const existing = await riftRotationCol(db).findOne({ date: today })
  if (existing) return existing
  return generateRiftRotation(db)
}
