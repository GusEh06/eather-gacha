import { Hono } from "hono"
import { z } from "zod"
import { adminMiddleware } from "../middleware/adminAuth"
import { requireRole } from "../middleware/roles"
import { getDb } from "../db/client"
import {
  entitiesCol,
  usersCol,
  marketListingsCol,
  userEntitiesCol,
  auditLogsCol,
  shardTransactionsCol,
  notificationsCol,
  type UserRole,
} from "../db/collections"
import { bucket } from "../config/firebase"
import { ObjectId } from "mongodb"
import { logAudit } from "../services/audit"
import { createNotification } from "../services/notifications"
import { recordShardTransaction } from "../services/transactions"

const router = new Hono()

// ─── Helpers ──────────────────────────────────────────────────────────────────

// P-02: validación de body con Zod (strict: rechaza campos extra)
function parseBody<T extends z.ZodTypeAny>(schema: T, raw: unknown):
  | { ok: true; data: z.infer<T> }
  | { ok: false; issues: unknown } {
  const result = schema.safeParse(raw)
  if (!result.success) {
    return { ok: false, issues: result.error.issues }
  }
  return { ok: true, data: result.data }
}

function startOfTodayUTC(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — GET /admin/stats (moderator+)
// Métricas económicas de la plataforma (base de P-34 / P-07)
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/stats", requireRole("moderator"), async (c) => {
  try {
    const db = await getDb()
    const today = startOfTodayUTC()

    const [
      totalUsers,
      shardsAgg,
      totalEntities,
      activeListings,
      dailyInvocationsAgg,
      dailySalesAgg,
      suspendedUsers,
    ] = await Promise.all([
      usersCol(db).countDocuments({}),
      usersCol(db)
        .aggregate<{ total: number }>([
          { $group: { _id: null, total: { $sum: "$shards" } } },
        ])
        .toArray(),
      entitiesCol(db).countDocuments({}),
      marketListingsCol(db).countDocuments({ status: "active" }),
      shardTransactionsCol(db).countDocuments({
        type: "invocacion",
        createdAt: { $gte: today },
      }),
      marketListingsCol(db)
        .aggregate<{ count: number; volume: number }>([
          { $match: { status: "sold", soldAt: { $gte: today } } },
          { $group: { _id: null, count: { $sum: 1 }, volume: { $sum: "$priceShards" } } },
        ])
        .toArray(),
      usersCol(db).countDocuments({ suspendedUntil: { $gt: new Date() } }),
    ])

    const dailySales = dailySalesAgg[0] ?? { count: 0, volume: 0 }
    // H-17: el tributo es el 5% destruido de cada venta
    const tributeToday = dailySales.volume - Math.floor(dailySales.volume * 0.95)

    return c.json({
      totalUsers,
      suspendedUsers,
      shardsCirculating: shardsAgg[0]?.total ?? 0,
      totalEntities,
      activeListings,
      dailyInvocations: dailyInvocationsAgg,
      dailyBazaarSales: dailySales.count,
      dailyBazaarVolume: dailySales.volume,
      tributeCollectedToday: tributeToday,
    })
  } catch (err) {
    console.error("[admin] stats error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// USUARIOS — gestión (P-05 suspensión, P-18 roles)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /admin/users?search=&limit=&offset= (moderator+)
router.get("/users", requireRole("moderator"), async (c) => {
  const search = c.req.query("search")?.trim()
  const limit = Math.min(Number(c.req.query("limit") ?? 50) || 50, 200)
  const offset = Math.max(Number(c.req.query("offset") ?? 0) || 0, 0)

  try {
    const db = await getDb()
    const filter: Record<string, unknown> = {}
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { clerkId: { $regex: search, $options: "i" } },
      ]
    }

    const [users, total] = await Promise.all([
      usersCol(db)
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      usersCol(db).countDocuments(filter),
    ])

    const now = new Date()
    return c.json({
      total,
      users: users.map((u) => ({
        clerkId: u.clerkId,
        username: u.username,
        title: u.title,
        shards: u.shards,
        pityCounter: u.pityCounter,
        inventoryCount: (u.inventory ?? []).length,
        roles: u.roles ?? ["binder"],
        suspended: !!(u.suspendedUntil && new Date(u.suspendedUntil) > now),
        suspendedUntil: u.suspendedUntil ?? null,
        suspensionReason: u.suspensionReason ?? null,
        listingLimit: u.listingLimit ?? 20,
        createdAt: u.createdAt,
      })),
    })
  } catch (err) {
    console.error("[admin] users list error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// PATCH /admin/users/:clerkId/suspend (moderator+) — P-05
const suspendSchema = z
  .object({
    reason: z.string().min(3).max(500),
    durationHours: z.number().int().min(1).max(24 * 365),
  })
  .strict()

router.patch("/users/:clerkId/suspend", requireRole("moderator"), async (c) => {
  const targetId = c.req.param("clerkId")
  const actorId = c.get("userId") as string

  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }
  const parsed = parseBody(suspendSchema, raw)
  if (!parsed.ok) return c.json({ error: "Validation failed", issues: parsed.issues }, 400)

  try {
    const db = await getDb()

    // Un moderador no puede suspender a un admin ni a sí mismo
    if (targetId === actorId) {
      return c.json({ error: "Cannot suspend yourself" }, 400)
    }
    const target = await usersCol(db).findOne({ clerkId: targetId })
    if (!target) return c.json({ error: "User not found" }, 404)
    if ((target.roles ?? []).includes("admin")) {
      return c.json({ error: "Cannot suspend an admin" }, 403)
    }

    const suspendedUntil = new Date(Date.now() + parsed.data.durationHours * 3_600_000)
    await usersCol(db).updateOne(
      { clerkId: targetId },
      {
        $set: {
          suspendedUntil,
          suspensionReason: parsed.data.reason,
          suspendedBy: actorId,
        },
      }
    )

    await logAudit(db, c, {
      userId: actorId,
      action: "admin.user.suspend",
      result: "success",
      details: { targetId, reason: parsed.data.reason, suspendedUntil },
    })

    return c.json({ success: true, suspendedUntil })
  } catch (err) {
    console.error("[admin] suspend error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// PATCH /admin/users/:clerkId/unsuspend (moderator+) — P-05
router.patch("/users/:clerkId/unsuspend", requireRole("moderator"), async (c) => {
  const targetId = c.req.param("clerkId")
  const actorId = c.get("userId") as string

  try {
    const db = await getDb()
    const result = await usersCol(db).updateOne(
      { clerkId: targetId },
      { $set: { suspendedUntil: null, suspensionReason: null, suspendedBy: null } }
    )
    if (result.matchedCount === 0) return c.json({ error: "User not found" }, 404)

    await logAudit(db, c, {
      userId: actorId,
      action: "admin.user.unsuspend",
      result: "success",
      details: { targetId },
    })

    return c.json({ success: true })
  } catch (err) {
    console.error("[admin] unsuspend error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// PATCH /admin/users/:clerkId/roles (admin only) — P-18
const rolesSchema = z
  .object({
    roles: z.array(z.enum(["binder", "moderator", "admin"])).max(3),
  })
  .strict()

router.patch("/users/:clerkId/roles", requireRole("admin"), async (c) => {
  const targetId = c.req.param("clerkId")
  const actorId = c.get("userId") as string

  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }
  const parsed = parseBody(rolesSchema, raw)
  if (!parsed.ok) return c.json({ error: "Validation failed", issues: parsed.issues }, 400)

  try {
    const db = await getDb()
    const roles = [...new Set(parsed.data.roles)] as UserRole[]
    const result = await usersCol(db).updateOne(
      { clerkId: targetId },
      { $set: { roles } }
    )
    if (result.matchedCount === 0) return c.json({ error: "User not found" }, 404)

    await logAudit(db, c, {
      userId: actorId,
      action: "admin.user.roles_change",
      result: "success",
      details: { targetId, roles },
    })

    return c.json({ success: true, roles })
  } catch (err) {
    console.error("[admin] roles error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// PATCH /admin/users/:clerkId/shards (admin only) — ajuste manual de balance
const shardsAdjustSchema = z
  .object({
    amount: z.number().int().min(-1_000_000).max(1_000_000),
    reason: z.string().min(3).max(500),
  })
  .strict()

router.patch("/users/:clerkId/shards", requireRole("admin"), async (c) => {
  const targetId = c.req.param("clerkId")
  const actorId = c.get("userId") as string

  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }
  const parsed = parseBody(shardsAdjustSchema, raw)
  if (!parsed.ok) return c.json({ error: "Validation failed", issues: parsed.issues }, 400)

  try {
    const db = await getDb()
    // No permitir dejar el balance en negativo
    const updated = await usersCol(db).findOneAndUpdate(
      parsed.data.amount < 0
        ? { clerkId: targetId, shards: { $gte: -parsed.data.amount } }
        : { clerkId: targetId },
      { $inc: { shards: parsed.data.amount } },
      { returnDocument: "after" }
    )
    if (!updated) {
      const exists = await usersCol(db).findOne({ clerkId: targetId })
      if (!exists) return c.json({ error: "User not found" }, 404)
      return c.json({ error: "Adjustment would leave a negative balance" }, 400)
    }

    await recordShardTransaction(db, {
      userId: targetId,
      type: "ajuste_admin",
      amount: parsed.data.amount,
      balanceAfter: updated.shards,
      description: `Ajuste de admin: ${parsed.data.reason}`,
    })
    await logAudit(db, c, {
      userId: actorId,
      action: "admin.user.shards_adjust",
      result: "success",
      details: { targetId, amount: parsed.data.amount, reason: parsed.data.reason },
    })

    return c.json({ success: true, newShards: updated.shards })
  } catch (err) {
    console.error("[admin] shards adjust error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// PATCH /admin/users/:clerkId/listing-limit (admin only) — P-39
const listingLimitSchema = z
  .object({ listingLimit: z.number().int().min(1).max(1000) })
  .strict()

router.patch("/users/:clerkId/listing-limit", requireRole("admin"), async (c) => {
  const targetId = c.req.param("clerkId")
  const actorId = c.get("userId") as string

  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }
  const parsed = parseBody(listingLimitSchema, raw)
  if (!parsed.ok) return c.json({ error: "Validation failed", issues: parsed.issues }, 400)

  try {
    const db = await getDb()
    const result = await usersCol(db).updateOne(
      { clerkId: targetId },
      { $set: { listingLimit: parsed.data.listingLimit } }
    )
    if (result.matchedCount === 0) return c.json({ error: "User not found" }, 404)

    await logAudit(db, c, {
      userId: actorId,
      action: "admin.user.listing_limit",
      result: "success",
      details: { targetId, listingLimit: parsed.data.listingLimit },
    })

    return c.json({ success: true })
  } catch (err) {
    console.error("[admin] listing limit error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// BAZAAR — moderación de listings (P-19)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /admin/listings?status=&limit= (moderator+)
router.get("/listings", requireRole("moderator"), async (c) => {
  const status = c.req.query("status") ?? "active"
  const limit = Math.min(Number(c.req.query("limit") ?? 100) || 100, 300)

  try {
    const db = await getDb()
    const filter: Record<string, unknown> = {}
    if (status !== "all") filter.status = status

    const listings = await marketListingsCol(db)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    return c.json({
      listings: listings.map((l) => ({
        _id: l._id!.toString(),
        sellerId: l.sellerId,
        sellerUsername: l.sellerUsername,
        entityName: l.entitySnapshot?.nombre,
        entityRarity: l.entitySnapshot?.rareza,
        imageUrl: l.entitySnapshot?.imageUrl,
        priceShards: l.priceShards,
        status: l.status,
        createdAt: l.createdAt,
        cancelledBy: l.cancelledBy ?? null,
        cancelReason: l.cancelReason ?? null,
      })),
    })
  } catch (err) {
    console.error("[admin] listings error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// DELETE /admin/listings/:id (moderator+) — P-19: cancelar listing con motivo
const cancelListingSchema = z
  .object({ reason: z.string().min(3).max(500) })
  .strict()

router.delete("/listings/:id", requireRole("moderator"), async (c) => {
  const listingId = c.req.param("id")
  const actorId = c.get("userId") as string

  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body (reason is required)" }, 400)
  }
  const parsed = parseBody(cancelListingSchema, raw)
  if (!parsed.ok) return c.json({ error: "Validation failed", issues: parsed.issues }, 400)

  try {
    const db = await getDb()

    // Solo listings activos pueden cancelarse (atómico)
    const cancelled = await marketListingsCol(db).findOneAndUpdate(
      { _id: new ObjectId(listingId), status: "active" },
      {
        $set: {
          status: "cancelled_by_mod",
          cancelledAt: new Date(),
          cancelledBy: actorId,
          cancelReason: parsed.data.reason,
        },
      },
      { returnDocument: "after" }
    )
    if (!cancelled) {
      return c.json({ error: "Listing not found or not active" }, 404)
    }

    // P-19: el vendedor recibe una notificación explicando la cancelación
    await createNotification(db, {
      userId: cancelled.sellerId,
      type: "listing_cancelled",
      title: "Listing retirado por moderación",
      message: `Tu listing de "${cancelled.entitySnapshot?.nombre}" (${cancelled.priceShards} Shards) fue retirado del Bazaar. Motivo: ${parsed.data.reason}. La entidad sigue en tu colección.`,
    })

    await logAudit(db, c, {
      userId: actorId,
      action: "admin.listing.cancel",
      result: "success",
      details: { listingId, sellerId: cancelled.sellerId, reason: parsed.data.reason },
    })

    return c.json({ success: true, status: "cancelled_by_mod" })
  } catch (err) {
    console.error("[admin] cancel listing error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// AUDITORÍA — GET /admin/audit-logs (admin only) — P-04
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/audit-logs", requireRole("admin"), async (c) => {
  const action = c.req.query("action")?.trim()
  const userId = c.req.query("userId")?.trim()
  const limit = Math.min(Number(c.req.query("limit") ?? 100) || 100, 500)
  const offset = Math.max(Number(c.req.query("offset") ?? 0) || 0, 0)

  try {
    const db = await getDb()
    const filter: Record<string, unknown> = {}
    if (action) filter.action = { $regex: `^${action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` }
    if (userId) filter.userId = userId

    const [logs, total] = await Promise.all([
      auditLogsCol(db).find(filter).sort({ timestamp: -1 }).skip(offset).limit(limit).toArray(),
      auditLogsCol(db).countDocuments(filter),
    ])

    return c.json({
      total,
      logs: logs.map((l) => ({
        _id: l._id!.toString(),
        timestamp: l.timestamp,
        requestId: l.requestId ?? null,
        userId: l.userId,
        ip: l.ip ?? null,
        action: l.action,
        result: l.result,
        details: l.details ?? {},
      })),
    })
  } catch (err) {
    console.error("[admin] audit logs error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// ENTIDADES — catálogo (H-19/H-20 + edición)
// ═══════════════════════════════════════════════════════════════════════════════

// Get all entities (admin via Clerk metadata — mecanismo original)
router.get("/entities", adminMiddleware, async (c) => {
  const db = await getDb()
  const entities = await entitiesCol(db).find({}).toArray()
  return c.json({ entities })
})

// Create a new entity (handles multipart/form-data)
router.post("/entities", adminMiddleware, async (c) => {
  const body = await c.req.parseBody()

  const nombre = body["nombre"] as string
  const rareza = body["rareza"] as string
  const arquetipo = body["arquetipo"] as string
  const epoca = body["epoca"] as string
  const descripcionLore = body["descripcionLore"] as string
  const descripcionOjos = body["descripcionOjos"] as string
  const disponibleRift = body["disponibleRift"] === "true"
  const imageFile = body["image"] as File | undefined

  if (!nombre || !rareza || !arquetipo || !epoca || !descripcionLore || !descripcionOjos || !imageFile) {
    return c.json({ error: "Missing required fields" }, 400)
  }

  // Upload image to Firebase Storage
  if (!bucket) {
    return c.json({ error: "Firebase bucket not configured" }, 500)
  }

  try {
    const buffer = await imageFile.arrayBuffer()
    const extension = imageFile.name.split('.').pop() || "png"
    const fileName = `entities/${Date.now()}_${nombre.replace(/\\s+/g, '_').toLowerCase()}.${extension}`

    const file = bucket.file(fileName)
    await file.save(Buffer.from(buffer), {
      contentType: imageFile.type || "image/png",
      public: true, // Make publicly accessible
      metadata: {
        cacheControl: "public, max-age=31536000",
      }
    })

    // Get the public URL
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`

    const newEntity = {
      nombre,
      rareza,
      arquetipo,
      epoca,
      descripcionLore,
      descripcionOjos,
      disponibleGacha: true,
      disponibleRift,
      imageUrl,
    }

    const db = await getDb()
    const result = await entitiesCol(db).insertOne(newEntity)

    await logAudit(db, c, {
      userId: c.get("userId") as string,
      action: "admin.entity.create",
      result: "success",
      details: { entityId: result.insertedId.toString(), nombre, rareza },
    })

    return c.json({ success: true, entityId: result.insertedId, imageUrl })
  } catch (error) {
    console.error("[admin] Error creating entity:", error)
    return c.json({ error: "Failed to create entity and upload image" }, 500)
  }
})

// PUT /admin/entities/:id — editar entidad (imagen opcional)
router.put("/entities/:id", adminMiddleware, async (c) => {
  const id = c.req.param("id")
  const body = await c.req.parseBody()

  try {
    const db = await getDb()
    const existing = await entitiesCol(db).findOne({ _id: new ObjectId(id) })
    if (!existing) return c.json({ error: "Entity not found" }, 404)

    const updates: Record<string, unknown> = {}
    for (const field of ["nombre", "rareza", "arquetipo", "epoca", "descripcionLore", "descripcionOjos"]) {
      const value = body[field]
      if (typeof value === "string" && value.trim()) updates[field] = value.trim()
    }
    if (body["disponibleRift"] !== undefined) updates.disponibleRift = body["disponibleRift"] === "true"
    if (body["disponibleGacha"] !== undefined) updates.disponibleGacha = body["disponibleGacha"] === "true"

    // Imagen nueva opcional
    const imageFile = body["image"] as File | undefined
    if (imageFile && imageFile.size > 0) {
      if (!bucket) return c.json({ error: "Firebase bucket not configured" }, 500)
      const buffer = await imageFile.arrayBuffer()
      const extension = imageFile.name.split(".").pop() || "png"
      const nombre = (updates.nombre as string) ?? existing.nombre
      const fileName = `entities/${Date.now()}_${nombre.replace(/\s+/g, "_").toLowerCase()}.${extension}`
      const file = bucket.file(fileName)
      await file.save(Buffer.from(buffer), {
        contentType: imageFile.type || "image/png",
        public: true,
        metadata: { cacheControl: "public, max-age=31536000" },
      })
      updates.imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`
    }

    if (Object.keys(updates).length === 0) {
      return c.json({ error: "No fields to update" }, 400)
    }

    await entitiesCol(db).updateOne({ _id: new ObjectId(id) }, { $set: updates })

    await logAudit(db, c, {
      userId: c.get("userId") as string,
      action: "admin.entity.update",
      result: "success",
      details: { entityId: id, fields: Object.keys(updates) },
    })

    return c.json({ success: true })
  } catch (error) {
    console.error("[admin] Error updating entity:", error)
    return c.json({ error: "Failed to update entity" }, 500)
  }
})

// Delete an entity
router.delete("/entities/:id", adminMiddleware, async (c) => {
  const id = c.req.param("id")
  const db = await getDb()

  try {
    const entity = await entitiesCol(db).findOne({ _id: new ObjectId(id) })
    if (entity && entity.imageUrl && bucket) {
      // Extract filename from URL (very basic extraction)
      const match = entity.imageUrl.match(/\/o\/(entities%2F[^?]+)/)
      if (match && match[1]) {
        const filePath = decodeURIComponent(match[1])
        try {
          await bucket.file(filePath).delete()
        } catch (e) {
          console.warn(`[admin] Could not delete image ${filePath} from bucket:`, e)
        }
      }
    }

    await entitiesCol(db).deleteOne({ _id: new ObjectId(id) })

    await logAudit(db, c, {
      userId: c.get("userId") as string,
      action: "admin.entity.delete",
      result: "success",
      details: { entityId: id, nombre: entity?.nombre },
    })

    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: "Failed to delete entity" }, 500)
  }
})

export default router
