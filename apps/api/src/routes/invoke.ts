import { Hono } from "hono"
import { authMiddleware } from "../middleware/auth"
import { getDb } from "../db/client"
import { usersCol, userEntitiesCol, ObjectId } from "../db/collections"
import { calcularRareza, actualizarPity, seleccionarEntidad } from "../services/gacha"

const invokeRoutes = new Hono()

const INVOKE_COST_X1 = 160
const INVOKE_COST_X10 = 1600

invokeRoutes.post("/", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string

  let body: { mode?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }

  const mode = body.mode
  if (mode !== "x1" && mode !== "x10") {
    return c.json({ error: "mode must be 'x1' or 'x10'" }, 400)
  }

  const pullCount = mode === "x1" ? 1 : 10
  const cost = mode === "x1" ? INVOKE_COST_X1 : INVOKE_COST_X10

  try {
    const db = await getDb()
    const users = usersCol(db)
    const userEntities = userEntitiesCol(db)

    // Atomic check-and-deduct: only succeeds if user exists AND has enough shards
    const user = await users.findOneAndUpdate(
      { clerkId, shards: { $gte: cost } },
      { $inc: { shards: -cost } },
      { returnDocument: "after" }
    )
    if (!user) {
      // Distinguish between "user not found" and "insufficient shards"
      const exists = await users.findOne({ clerkId })
      if (!exists) return c.json({ error: "User not found" }, 404)
      return c.json(
        { error: "Insufficient Shards", needed: cost, have: exists.shards },
        402
      )
    }

    let pityCounter = user.pityCounter
    let pityMythicCounter = user.pityMythicCounter

    const results: Array<{ userEntityId: string; entity: Record<string, unknown> }> = []
    const insertedIds: ObjectId[] = []

    for (let i = 0; i < pullCount; i++) {
      const rareza = calcularRareza(pityCounter, pityMythicCounter)
      const { newPityCounter, newPityMythicCounter } = actualizarPity(
        rareza,
        pityCounter,
        pityMythicCounter
      )
      pityCounter = newPityCounter
      pityMythicCounter = newPityMythicCounter

      const entity = await seleccionarEntidad(db, rareza)
      if (!entity) {
        // Should never happen on a seeded database — skip gracefully
        console.error(`[invoke] No entity found for rareza: ${rareza}`)
        continue
      }

      const inserted = await userEntities.insertOne({
        entityId: entity._id!,
        ownerId: clerkId,
        obtainedAt: new Date(),
        obtainedVia: "gacha",
      })

      insertedIds.push(inserted.insertedId)

      results.push({
        userEntityId: inserted.insertedId.toString(),
        entity: {
          _id: entity._id!.toString(),
          nombre: entity.nombre,
          rareza: entity.rareza,
          epoca: entity.epoca,
          arquetipo: entity.arquetipo,
          descripcionLore: entity.descripcionLore,
          imageUrl: entity.imageUrl,
          descripcionOjos: entity.descripcionOjos,
          disponibleGacha: entity.disponibleGacha,
          disponibleRift: entity.disponibleRift,
        },
      })
    }

    // Batch-update pity counters and inventory in a single write
    await users.updateOne(
      { clerkId },
      {
        $set: { pityCounter, pityMythicCounter },
        $push: { inventory: { $each: insertedIds } },
      }
    )

    const updatedUser = await users.findOne({ clerkId })

    return c.json({
      results,
      newShards: updatedUser?.shards ?? user.shards - cost,
      newPityCounter: pityCounter,
      newPityMythicCounter: pityMythicCounter,
    })
  } catch (err) {
    console.error("[invoke] error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

export default invokeRoutes
