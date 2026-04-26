import { Hono } from "hono"
import { authMiddleware } from "../middleware/auth"
import { getDb } from "../db/client"
import { usersCol, userEntitiesCol, entitiesCol, riftRotationCol } from "../db/collections"
import { getCurrentRiftRotation } from "../services/rift"

const riftRoutes = new Hono()

// ── GET /rift/current ─────────────────────────────────────────────────────────
// Public — no auth required to view
riftRoutes.get("/current", async (c) => {
  try {
    const db = await getDb()
    const rotation = await getCurrentRiftRotation(db)

    // Populate entity details for each slot
    const entityIds = rotation.slots.map((s) => s.entityId)
    const entityDocs = await entitiesCol(db).find({ _id: { $in: entityIds } }).toArray()
    const entityMap = new Map(entityDocs.map((e) => [e._id!.toString(), e]))

    return c.json({
      date: rotation.date,
      expiresAt: rotation.expiresAt,
      slots: rotation.slots.map((slot, idx) => ({
        index: idx,
        entityId: slot.entityId.toString(),
        priceShards: slot.priceShards,
        sold: slot.sold,
        entity: (() => {
          const e = entityMap.get(slot.entityId.toString())
          if (!e) return null
          return {
            _id: e._id!.toString(),
            nombre: e.nombre,
            rareza: e.rareza,
            arquetipo: e.arquetipo,
            descripcionLore: e.descripcionLore,
            imageUrl: e.imageUrl,
            disponibleRift: e.disponibleRift,
          }
        })(),
      })),
    })
  } catch (err) {
    console.error("[rift] current error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// ── POST /rift/buy ────────────────────────────────────────────────────────────
riftRoutes.post("/buy", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string

  let body: { slotIndex?: number }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }

  const { slotIndex } = body
  if (typeof slotIndex !== "number" || slotIndex < 0 || slotIndex > 4) {
    return c.json({ error: "slotIndex must be 0–4" }, 400)
  }

  try {
    const db = await getDb()
    const today = new Date().toISOString().split("T")[0]!

    const rotation = await riftRotationCol(db).findOne({ date: today })
    if (!rotation) return c.json({ error: "No Rift rotation for today" }, 404)

    const slot = rotation.slots[slotIndex]
    if (!slot) return c.json({ error: "Invalid slot index" }, 400)
    if (slot.sold) return c.json({ error: "Slot already claimed" }, 410)

    // 1. Atomically deduct shards — only proceeds if user has enough
    const buyer = await usersCol(db).findOneAndUpdate(
      { clerkId, shards: { $gte: slot.priceShards } },
      { $inc: { shards: -slot.priceShards } },
      { returnDocument: "after" }
    )
    if (!buyer) {
      const exists = await usersCol(db).findOne({ clerkId })
      if (!exists) return c.json({ error: "User not found" }, 404)
      return c.json(
        { error: "Insufficient Shards", needed: slot.priceShards, have: exists.shards },
        402
      )
    }

    // 2. Atomically claim the slot (now that payment is secured)
    const claimed = await riftRotationCol(db).findOneAndUpdate(
      { date: today, [`slots.${slotIndex}.sold`]: false },
      { $set: { [`slots.${slotIndex}.sold`]: true } },
      { returnDocument: "after" }
    )
    if (!claimed) {
      // Slot was concurrently claimed — refund shards
      await usersCol(db).updateOne({ clerkId }, { $inc: { shards: slot.priceShards } })
      return c.json({ error: "Slot was already claimed" }, 410)
    }

    // Create user_entity record
    const inserted = await userEntitiesCol(db).insertOne({
      entityId: slot.entityId,
      ownerId: clerkId,
      obtainedAt: new Date(),
      obtainedVia: "rift",
    })

    // Add to inventory
    await usersCol(db).updateOne(
      { clerkId },
      { $push: { inventory: inserted.insertedId } }
    )

    return c.json({
      message: "Purchase successful",
      newShards: buyer.shards,           // already post-deduction (returnDocument: "after")
      userEntityId: inserted.insertedId.toString(),
    })
  } catch (err) {
    console.error("[rift] buy error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

export default riftRoutes
