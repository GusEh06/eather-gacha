import type { Db } from "mongodb"
import type { Context } from "hono"
import { usersCol, userEntitiesCol, type ObjectId } from "../db/collections"
import { calcularRareza, actualizarPity, seleccionarEntidad } from "./gacha"
import { logAudit } from "./audit"
import { recordShardTransaction } from "./transactions"

export const INVOKE_COST_X1 = 160
export const INVOKE_COST_X10 = 1600

export class InvokeError extends Error {
  status: number
  extra?: Record<string, unknown>
  constructor(message: string, status: number, extra?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

export interface InvokeResult {
  results: Array<{ userEntityId: string; entity: Record<string, unknown> }>
  newShards: number
  newPityCounter: number
  newPityMythicCounter: number
}

/**
 * Ejecuta una invocación gacha (x1 o x10): deduce Shards, resuelve rareza/pity,
 * inserta las entidades obtenidas y registra transacción + auditoría.
 * Usado tanto por la ruta REST POST /invoke como por la tool MCP invoke_gacha.
 */
export async function performInvoke(
  db: Db,
  clerkId: string,
  mode: "x1" | "x10",
  c: Context | null
): Promise<InvokeResult> {
  const pullCount = mode === "x1" ? 1 : 10
  const cost = mode === "x1" ? INVOKE_COST_X1 : INVOKE_COST_X10

  const users = usersCol(db)
  const userEntities = userEntitiesCol(db)

  const user = await users.findOneAndUpdate(
    { clerkId, shards: { $gte: cost } },
    { $inc: { shards: -cost } },
    { returnDocument: "after" }
  )
  if (!user) {
    const exists = await users.findOne({ clerkId })
    if (!exists) throw new InvokeError("User not found", 404)
    throw new InvokeError("Insufficient Shards", 402, { needed: cost, have: exists.shards })
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

  await users.updateOne(
    { clerkId },
    {
      $set: { pityCounter, pityMythicCounter },
      $push: { inventory: { $each: insertedIds } },
    }
  )

  const updatedUser = await users.findOne({ clerkId })

  await recordShardTransaction(db, {
    userId: clerkId,
    type: "invocacion",
    amount: -cost,
    balanceAfter: updatedUser?.shards ?? user.shards,
    description: `Invocación ${mode}: ${results.map((r) => r.entity.nombre).join(", ")}`,
  })
  await logAudit(db, c, {
    userId: clerkId,
    action: "gacha.invoke",
    result: "success",
    details: {
      mode,
      cost,
      obtained: results.map((r) => ({ nombre: r.entity.nombre, rareza: r.entity.rareza })),
    },
  })

  return {
    results,
    newShards: updatedUser?.shards ?? user.shards - cost,
    newPityCounter: pityCounter,
    newPityMythicCounter: pityMythicCounter,
  }
}
