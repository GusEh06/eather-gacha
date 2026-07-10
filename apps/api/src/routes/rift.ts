import { Hono } from "hono"
import { authMiddleware } from "../middleware/auth"
import { getDb } from "../db/client"
import { entitiesCol } from "../db/collections"
import { getCurrentRiftRotation, buyRiftSlot, RiftError } from "../services/rift"

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
  if (typeof slotIndex !== "number") {
    return c.json({ error: "slotIndex must be 0–4" }, 400)
  }

  try {
    const db = await getDb()
    const result = await buyRiftSlot(db, clerkId, slotIndex, c)
    return c.json(result)
  } catch (err) {
    if (err instanceof RiftError) {
      return c.json({ error: err.message, ...err.extra }, err.status as 400 | 402 | 404 | 410)
    }
    console.error("[rift] buy error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

export default riftRoutes
