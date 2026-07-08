import { Hono } from "hono"
import { authMiddleware } from "../middleware/auth"
import { getDb } from "../db/client"
import {
  usersCol,
  userEntitiesCol,
  entitiesCol,
  shardTransactionsCol,
  notificationsCol,
  ObjectId,
} from "../db/collections"

const userRoutes = new Hono()

const ONBOARDING_SHARDS = 320

// GET /user/profile — returns shards, pity counters, inventory count
// Auto-provisions the user in MongoDB on first authenticated request
// so we don't depend on the Clerk webhook (which doesn't arrive in local dev).
userRoutes.get("/profile", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string

  try {
    const db = await getDb()
    const users = usersCol(db)

    let user = await users.findOne({ clerkId })

    // Auto-provision: create user if they exist in Clerk but not in MongoDB
    if (!user) {
      const newUser = {
        clerkId,
        username: `binder_${clerkId.slice(-6)}`,
        title: "Aether Binder",
        shards: ONBOARDING_SHARDS,
        pityCounter: 0,
        pityMythicCounter: 0,
        inventory: [],
        createdAt: new Date(),
      }
      await users.insertOne(newUser)
      console.log(`[user] Auto-provisioned Aether Binder (${clerkId}) with ${ONBOARDING_SHARDS} Shards`)
      user = await users.findOne({ clerkId })
    }

    if (!user) {
      return c.json({ error: "User not found" }, 404)
    }

    return c.json({
      clerkId: user.clerkId,
      username: user.username,
      title: user.title,
      shards: user.shards,
      pityCounter: user.pityCounter,
      pityMythicCounter: user.pityMythicCounter,
      inventoryCount: (user.inventory ?? []).length,
      createdAt: user.createdAt,
    })
  } catch (err) {
    console.error("[user] profile error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// GET /user/inventory — returns full inventory with entity details
userRoutes.get("/inventory", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string

  try {
    const db = await getDb()
    const userEntities = userEntitiesCol(db)
    const entities = entitiesCol(db)

    const owned = await userEntities.find({ ownerId: clerkId }).toArray()

    // Populate entity data
    const entityIds = owned.map((ue) => ue.entityId)
    const entityDocs = await entities
      .find({ _id: { $in: entityIds } })
      .toArray()

    const entityMap = new Map(entityDocs.map((e) => [e._id!.toString(), e]))

    const inventory = owned.map((ue) => ({
      _id: ue._id!.toString(),
      entityId: ue.entityId.toString(),
      ownerId: ue.ownerId,
      obtainedAt: ue.obtainedAt,
      obtainedVia: ue.obtainedVia,
      entity: entityMap.get(ue.entityId.toString()) ?? null,
    }))

    return c.json({ inventory })
  } catch (err) {
    console.error("[user] inventory error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// ── P-40: GET /user/transactions?limit=&offset= — historial de Shards ─────────
userRoutes.get("/transactions", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string
  const limit = Math.min(Number(c.req.query("limit") ?? 50) || 50, 200)
  const offset = Math.max(Number(c.req.query("offset") ?? 0) || 0, 0)

  try {
    const db = await getDb()
    const [transactions, total] = await Promise.all([
      shardTransactionsCol(db)
        .find({ userId: clerkId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      shardTransactionsCol(db).countDocuments({ userId: clerkId }),
    ])

    return c.json({
      total,
      transactions: transactions.map((t) => ({
        _id: t._id!.toString(),
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        description: t.description,
        createdAt: t.createdAt,
      })),
    })
  } catch (err) {
    console.error("[user] transactions error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// ── P-38: notificaciones in-app ───────────────────────────────────────────────
userRoutes.get("/notifications", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string

  try {
    const db = await getDb()
    const notifications = await notificationsCol(db)
      .find({ userId: clerkId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()

    return c.json({
      unreadCount: notifications.filter((n) => !n.read).length,
      notifications: notifications.map((n) => ({
        _id: n._id!.toString(),
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
      })),
    })
  } catch (err) {
    console.error("[user] notifications error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// PATCH /user/notifications/:id/read — marcar una notificación como leída
userRoutes.patch("/notifications/:id/read", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string
  const id = c.req.param("id")

  try {
    const db = await getDb()
    await notificationsCol(db).updateOne(
      { _id: new ObjectId(id), userId: clerkId },
      { $set: { read: true } }
    )
    return c.json({ success: true })
  } catch (err) {
    console.error("[user] mark notification read error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// PATCH /user/notifications/read-all — marcar todas como leídas
userRoutes.patch("/notifications/read-all", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string

  try {
    const db = await getDb()
    await notificationsCol(db).updateMany(
      { userId: clerkId, read: false },
      { $set: { read: true } }
    )
    return c.json({ success: true })
  } catch (err) {
    console.error("[user] mark all read error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

export default userRoutes
