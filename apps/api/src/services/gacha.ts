import type { Db } from "mongodb"
import { entitiesCol } from "../db/collections"

type Rareza = "dust" | "nebula" | "comet" | "nova" | "pulsar" | "eclipse" | "singularity"

function elegirMythic(): Rareza {
  return Math.random() < 0.9 ? "eclipse" : "singularity"
}

/**
 * Calculates the rarity for a single pull, taking pity counters into account.
 * pityCounter      = pulls since last Pulsar or higher (hard pity at 89)
 * pityMythicCounter = pulls since last Eclipse or Singularity (hard pity at 179)
 */
export function calcularRareza(pityCounter: number, pityMythicCounter: number): Rareza {
  // Hard pity — guaranteed mythic (Eclipse / Singularity)
  if (pityMythicCounter >= 179) return elegirMythic()

  // Hard pity — guaranteed Pulsar
  if (pityCounter >= 89) return "pulsar"

  // Soft pity — Pulsar probability increases by 6 % per pull starting at pull 70
  let pulsarProb = 0.029
  if (pityCounter >= 69) {
    pulsarProb = 0.029 + (pityCounter - 69) * 0.06
  }

  const roll = Math.random()

  // Check rarities from rarest to most common
  if (roll < 0.0001) return "singularity"
  if (roll < 0.001) return "eclipse"                         // < 0.0001 + 0.0009
  if (roll < 0.001 + pulsarProb) return "pulsar"
  if (roll < 0.001 + pulsarProb + 0.04) return "nova"
  if (roll < 0.001 + pulsarProb + 0.04 + 0.10) return "comet"
  if (roll < 0.001 + pulsarProb + 0.04 + 0.10 + 0.25) return "nebula"
  return "dust"
}

/**
 * Returns updated pity counters after a pull result.
 * Pulsar+ resets pityCounter; Eclipse/Singularity also resets pityMythicCounter.
 */
export function actualizarPity(
  rareza: Rareza,
  pityCounter: number,
  pityMythicCounter: number
): { newPityCounter: number; newPityMythicCounter: number } {
  const isPulsarOrHigher = (["pulsar", "eclipse", "singularity"] as Rareza[]).includes(rareza)
  const isMythic = (["eclipse", "singularity"] as Rareza[]).includes(rareza)

  return {
    newPityCounter: isPulsarOrHigher ? 0 : pityCounter + 1,
    newPityMythicCounter: isMythic ? 0 : pityMythicCounter + 1,
  }
}

/**
 * Picks a random entity from the catalog matching the given rarity that is
 * available for gacha pulls. Returns null only if the DB is empty for that
 * rarity (should never happen on a seeded database).
 */
export async function seleccionarEntidad(db: Db, rareza: string) {
  const entities = entitiesCol(db)
  const available = await entities.find({ rareza, disponibleGacha: true }).toArray()
  if (available.length === 0) return null
  const idx = Math.floor(Math.random() * available.length)
  return available[idx]
}
