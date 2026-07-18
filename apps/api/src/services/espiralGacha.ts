import type { Db } from "mongodb"
import type { Context } from "hono"
import { entitiesCol, usersCol, userEntitiesCol, type ObjectId } from "../db/collections"
import { recordEcosTransaction } from "./ecosTransactions"
import { logAudit } from "./audit"
import {
  ALTAR_ECO_COST_X1,
  ALTAR_ECO_COST_X10,
  ALTAR_ECO_HARD_PITY,
  ALTAR_ECO_SOFT_PITY_START,
  ALTAR_ECO_SOFT_PITY_STEP,
} from "../../../../packages/shared/src/espiral"

type Rareza = "dust" | "nebula" | "comet" | "nova" | "pulsar"

/**
 * Altar del Eco — banner exclusivo de Ecos del Vacío con TECHO EN PULSAR:
 * nunca sale eclipse ni singularity (esa masa de probabilidad, 0.001, se
 * redistribuye hacia pulsar → 0.03). Un solo pity (sin tramo mítico):
 * hard pity garantiza pulsar en el pull 50, soft pity desde el 40.
 */
export function calcularRarezaEspiral(pityCounter: number): Rareza {
  if (pityCounter >= ALTAR_ECO_HARD_PITY) return "pulsar"

  let pulsarProb = 0.03
  if (pityCounter >= ALTAR_ECO_SOFT_PITY_START) {
    pulsarProb = 0.03 + (pityCounter - ALTAR_ECO_SOFT_PITY_START) * ALTAR_ECO_SOFT_PITY_STEP
  }

  const roll = Math.random()
  if (roll < pulsarProb) return "pulsar"
  if (roll < pulsarProb + 0.04) return "nova"
  if (roll < pulsarProb + 0.04 + 0.1) return "comet"
  if (roll < pulsarProb + 0.04 + 0.1 + 0.25) return "nebula"
  return "dust"
}

export function actualizarPityEspiral(rareza: Rareza, pityCounter: number): number {
  return rareza === "pulsar" ? 0 : pityCounter + 1
}

/**
 * Pool del banner curado con flag propio `disponibleAltarEco`, independiente
 * de `disponibleGacha`. Fallback: si el admin aún no marcó ninguna entidad de
 * esa rareza para este banner, usamos el pool del gacha normal para que el
 * banner nunca quede vacío.
 */
export async function seleccionarEntidadAltarEco(db: Db, rareza: string) {
  const entities = entitiesCol(db)
  let available = await entities.find({ rareza, disponibleAltarEco: true }).toArray()
  if (available.length === 0) {
    available = await entities.find({ rareza, disponibleGacha: true }).toArray()
  }
  if (available.length === 0) return null
  const idx = Math.floor(Math.random() * available.length)
  return available[idx]
}

export class AltarEcoError extends Error {
  status: number
  extra?: Record<string, unknown>
  constructor(message: string, status: number, extra?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

export interface AltarEcoResult {
  results: Array<{ userEntityId: string; entity: Record<string, unknown> }>
  newEcos: number
  newEspiralPityCounter: number
}

/**
 * Ejecuta una invocación en el Altar del Eco (x1 o x10): deduce Ecos
 * atómicamente, resuelve rareza con techo pulsar, inserta entidades y
 * registra transacción + auditoría. Mismo shape que performInvoke.
 */
export async function performAltarEcoPull(
  db: Db,
  clerkId: string,
  mode: "x1" | "x10",
  c: Context | null
): Promise<AltarEcoResult> {
  const pullCount = mode === "x1" ? 1 : 10
  const cost = mode === "x1" ? ALTAR_ECO_COST_X1 : ALTAR_ECO_COST_X10

  const users = usersCol(db)
  const userEntities = userEntitiesCol(db)

  const user = await users.findOneAndUpdate(
    { clerkId, ecos: { $gte: cost } },
    { $inc: { ecos: -cost } },
    { returnDocument: "after" }
  )
  if (!user) {
    const exists = await users.findOne({ clerkId })
    if (!exists) throw new AltarEcoError("User not found", 404)
    throw new AltarEcoError("Insufficient Ecos", 402, { needed: cost, have: exists.ecos ?? 0 })
  }

  let pity = user.espiralPityCounter ?? 0
  const results: AltarEcoResult["results"] = []
  const insertedIds: ObjectId[] = []

  for (let i = 0; i < pullCount; i++) {
    const rareza = calcularRarezaEspiral(pity)
    pity = actualizarPityEspiral(rareza, pity)

    const entity = await seleccionarEntidadAltarEco(db, rareza)
    if (!entity) {
      console.error(`[altar-eco] No entity found for rareza: ${rareza}`)
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
      $set: { espiralPityCounter: pity },
      $push: { inventory: { $each: insertedIds } },
    }
  )

  const updatedUser = await users.findOne({ clerkId })
  const balance = updatedUser?.ecos ?? 0

  await recordEcosTransaction(db, {
    userId: clerkId,
    type: "altar_pull",
    amount: -cost,
    balanceAfter: balance,
    description: `Altar del Eco ${mode}: ${results.map((r) => r.entity.nombre).join(", ")}`,
  })
  await logAudit(db, c, {
    userId: clerkId,
    action: "espiral.altar_eco_pull",
    result: "success",
    details: {
      mode,
      cost,
      obtained: results.map((r) => ({ nombre: r.entity.nombre, rareza: r.entity.rareza })),
    },
  })

  return { results, newEcos: balance, newEspiralPityCounter: pity }
}
