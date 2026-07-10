import type { Db } from "mongodb"
import type { Context } from "hono"
import {
  entitiesCol,
  riftRotationCol,
  usersCol,
  userEntitiesCol,
  type RiftRotationDoc,
} from "../db/collections"
import { logAudit } from "./audit"
import { recordShardTransaction } from "./transactions"

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

export class RiftError extends Error {
  status: number
  extra?: Record<string, unknown>
  constructor(message: string, status: number, extra?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

/**
 * Compra un slot de la rotación de hoy: deduce Shards atómicamente, reclama el
 * slot (con reembolso si otro comprador ganó la carrera) y entrega la entidad.
 * Compartido entre POST /rift/buy y la tool MCP buy_rift_slot (P-27).
 */
export async function buyRiftSlot(
  db: Db,
  clerkId: string,
  slotIndex: number,
  c: Context | null
): Promise<{ message: string; newShards: number; userEntityId: string }> {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 4) {
    throw new RiftError("slotIndex must be 0–4", 400)
  }

  const today = getTodayDate()

  const rotation = await riftRotationCol(db).findOne({ date: today })
  if (!rotation) throw new RiftError("No Rift rotation for today", 404)

  const slot = rotation.slots[slotIndex]
  if (!slot) throw new RiftError("Invalid slot index", 400)
  if (slot.sold) throw new RiftError("Slot already claimed", 410)

  // 1. Deducción atómica — solo procede si hay saldo suficiente
  const buyer = await usersCol(db).findOneAndUpdate(
    { clerkId, shards: { $gte: slot.priceShards } },
    { $inc: { shards: -slot.priceShards } },
    { returnDocument: "after" }
  )
  if (!buyer) {
    const exists = await usersCol(db).findOne({ clerkId })
    if (!exists) throw new RiftError("User not found", 404)
    throw new RiftError("Insufficient Shards", 402, {
      needed: slot.priceShards,
      have: exists.shards,
    })
  }

  // 2. Reclamo atómico del slot (pago ya asegurado)
  const claimed = await riftRotationCol(db).findOneAndUpdate(
    { date: today, [`slots.${slotIndex}.sold`]: false },
    { $set: { [`slots.${slotIndex}.sold`]: true } },
    { returnDocument: "after" }
  )
  if (!claimed) {
    // Otro comprador ganó la carrera — reembolso
    await usersCol(db).updateOne({ clerkId }, { $inc: { shards: slot.priceShards } })
    throw new RiftError("Slot was already claimed", 410)
  }

  const inserted = await userEntitiesCol(db).insertOne({
    entityId: slot.entityId,
    ownerId: clerkId,
    obtainedAt: new Date(),
    obtainedVia: "rift",
  })

  await usersCol(db).updateOne({ clerkId }, { $push: { inventory: inserted.insertedId } })

  const boughtEntity = await entitiesCol(db).findOne({ _id: slot.entityId })
  await recordShardTransaction(db, {
    userId: clerkId,
    type: "compra_rift",
    amount: -slot.priceShards,
    balanceAfter: buyer.shards,
    description: `Compra en Rift: ${boughtEntity?.nombre ?? "entidad"} (${slot.priceShards} Sh)`,
  })
  await logAudit(db, c, {
    userId: clerkId,
    action: "rift.buy",
    result: "success",
    details: { slotIndex, entity: boughtEntity?.nombre, priceShards: slot.priceShards },
  })

  return {
    message: "Purchase successful",
    newShards: buyer.shards,
    userEntityId: inserted.insertedId.toString(),
  }
}
