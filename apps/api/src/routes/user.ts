import { Hono } from "hono"
import { authMiddleware } from "../middleware/auth"
import { getDb } from "../db/client"
import { usersCol, userEntitiesCol, entitiesCol, ObjectId } from "../db/collections"

const userRoutes = new Hono()

// GET /user/profile — returns shards, pity counters, inventory count
userRoutes.get("/profile", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string

  try {
    const db = await getDb()
    const users = usersCol(db)

    const user = await users.findOne({ clerkId })
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
      inventoryCount: user.inventory.length,
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

export default userRoutes
