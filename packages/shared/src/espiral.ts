import type { Arquetipo, Rareza } from "./types"

// ═══════════════════════════════════════════════════════════════════════════
// La Espiral — tipos y matemática compartida (API autoritativa + Web preview)
// Vive en shared para que servidor y cliente usen exactamente la misma
// matemática de stats sin drift.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Stats de combate ────────────────────────────────────────────────────────

export interface EntityStats {
  hp: number
  atk: number
  def: number
  vel: number
}

/** Base exponencial ~×1.6 por tramo de rareza (vel ~×1.2 para que el orden
 *  de turno siga siendo relevante entre tramos). */
export const RARITY_BASE_STATS: Record<Rareza, EntityStats> = {
  dust: { hp: 100, atk: 20, def: 15, vel: 10 },
  nebula: { hp: 160, atk: 32, def: 24, vel: 12 },
  comet: { hp: 256, atk: 51, def: 38, vel: 14 },
  nova: { hp: 410, atk: 82, def: 61, vel: 17 },
  pulsar: { hp: 655, atk: 131, def: 98, vel: 20 },
  eclipse: { hp: 1050, atk: 210, def: 157, vel: 24 },
  singularity: { hp: 1680, atk: 336, def: 251, vel: 29 },
}

/** Modificadores multiplicativos por arquetipo, aplicados sobre la base de rareza. */
export const ARCHETYPE_MODIFIERS: Record<Arquetipo, Partial<Record<keyof EntityStats, number>>> = {
  Guerrero: { atk: 1.2, def: 0.9 },
  Guardián: { def: 1.3, hp: 1.1, atk: 0.85 },
  Oráculo: { vel: 1.15, atk: 1.05, def: 0.9 },
  Devorador: { atk: 1.3, hp: 0.9 },
  Trickster: { vel: 1.3, def: 0.85 },
}

/**
 * Stats efectivos de una entidad: base por rareza × modificador de arquetipo,
 * con override opcional del admin campo a campo. 100% data-driven — una entidad
 * recién subida es jugable al instante sin trabajo manual.
 */
export function getEffectiveStats(entity: {
  rareza: Rareza | string
  arquetipo: Arquetipo | string
  statsOverride?: Partial<EntityStats> | null
}): EntityStats {
  const base = RARITY_BASE_STATS[entity.rareza as Rareza] ?? RARITY_BASE_STATS.dust
  const mods = ARCHETYPE_MODIFIERS[entity.arquetipo as Arquetipo] ?? {}
  const stats: EntityStats = {
    hp: Math.round(base.hp * (mods.hp ?? 1)),
    atk: Math.round(base.atk * (mods.atk ?? 1)),
    def: Math.round(base.def * (mods.def ?? 1)),
    vel: Math.round(base.vel * (mods.vel ?? 1)),
  }
  if (entity.statsOverride) {
    if (entity.statsOverride.hp != null) stats.hp = entity.statsOverride.hp
    if (entity.statsOverride.atk != null) stats.atk = entity.statsOverride.atk
    if (entity.statsOverride.def != null) stats.def = entity.statsOverride.def
    if (entity.statsOverride.vel != null) stats.vel = entity.statsOverride.vel
  }
  return stats
}

// ─── Habilidades por tramo de rareza ─────────────────────────────────────────

export type EspiralAbilityId =
  | "none"
  | "stun" // nova+: aturde al enemigo 1 turno
  | "burn" // nova+: quemadura, daño por turno
  | "team_atk_buff" // pulsar+: buff de ataque al equipo
  | "team_def_buff" // pulsar+: buff de defensa al equipo
  | "extra_turn" // eclipse/singularity: actúa dos veces
  | "ignore_def" // eclipse/singularity: ignora defensa enemiga
  | "one_time_revive" // eclipse/singularity: revive una vez por combate

export interface EspiralAbilityDef {
  id: EspiralAbilityId
  nombre: string
  descripcion: string
  /** Probabilidad de proc por turno (o de activación inicial para buffs). */
  chance: number
  /** Magnitud: % de buff, fracción de daño de quemadura, turnos de stun, % HP de revive. */
  magnitude: number
}

export const ESPIRAL_ABILITIES: Record<EspiralAbilityId, EspiralAbilityDef> = {
  none: { id: "none", nombre: "—", descripcion: "Sin habilidad especial.", chance: 0, magnitude: 0 },
  stun: {
    id: "stun",
    nombre: "Parálisis Astral",
    descripcion: "Al golpear, puede aturdir al enemigo durante 1 turno.",
    chance: 0.25,
    magnitude: 1,
  },
  burn: {
    id: "burn",
    nombre: "Ignición del Vacío",
    descripcion: "Al golpear, puede incendiar al enemigo (daño residual 2 turnos).",
    chance: 0.3,
    magnitude: 0.4,
  },
  team_atk_buff: {
    id: "team_atk_buff",
    nombre: "Resonancia Ofensiva",
    descripcion: "Al iniciar el combate, potencia el ataque de todo el equipo.",
    chance: 0.6,
    magnitude: 0.25,
  },
  team_def_buff: {
    id: "team_def_buff",
    nombre: "Égida Compartida",
    descripcion: "Al iniciar el combate, refuerza la defensa de todo el equipo.",
    chance: 0.6,
    magnitude: 0.35,
  },
  extra_turn: {
    id: "extra_turn",
    nombre: "Fractura Temporal",
    descripcion: "Rompe las reglas: puede actuar dos veces en el mismo turno.",
    chance: 0.4,
    magnitude: 1,
  },
  ignore_def: {
    id: "ignore_def",
    nombre: "Colapso Absoluto",
    descripcion: "Rompe las reglas: sus golpes ignoran la defensa enemiga.",
    chance: 1,
    magnitude: 1,
  },
  one_time_revive: {
    id: "one_time_revive",
    nombre: "Renacer Singular",
    descripcion: "Rompe las reglas: la primera vez que cae, renace con la mitad de su esencia.",
    chance: 1,
    magnitude: 0.5,
  },
}

/**
 * Habilidad derivada de rareza + arquetipo (data-driven, override opcional).
 * dust/nebula/comet → sin habilidad · nova → efecto de estado ·
 * pulsar → buff de equipo · eclipse/singularity → regla rota.
 */
export function getEspiralAbility(entity: {
  rareza: Rareza | string
  arquetipo: Arquetipo | string
  espiralAbilityOverride?: EspiralAbilityId | null
}): EspiralAbilityId {
  if (entity.espiralAbilityOverride) return entity.espiralAbilityOverride
  const rareza = entity.rareza as Rareza
  const arquetipo = entity.arquetipo as Arquetipo
  switch (rareza) {
    case "nova":
      return arquetipo === "Guerrero" || arquetipo === "Devorador" ? "burn" : "stun"
    case "pulsar":
      return arquetipo === "Guardián" || arquetipo === "Oráculo" ? "team_def_buff" : "team_atk_buff"
    case "eclipse":
      if (arquetipo === "Guardián") return "one_time_revive"
      if (arquetipo === "Oráculo" || arquetipo === "Trickster") return "extra_turn"
      return "ignore_def"
    case "singularity":
      if (arquetipo === "Guardián") return "one_time_revive"
      if (arquetipo === "Guerrero" || arquetipo === "Devorador") return "ignore_def"
      return "extra_turn"
    default:
      return "none"
  }
}

// ─── Escalado de enemigos por piso ───────────────────────────────────────────

export const ESPIRAL_BOSS_EVERY = 10
export const ESPIRAL_BOSS_MULT = 3

export function isBossFloor(floor: number): boolean {
  return floor > 0 && floor % ESPIRAL_BOSS_EVERY === 0
}

/** Curva exponencial suave — a afinar con playtesting. */
export function enemyStatsForFloor(floor: number): EntityStats {
  const boss = isBossFloor(floor) ? ESPIRAL_BOSS_MULT : 1
  return {
    hp: Math.round(80 * 1.045 ** floor * boss),
    atk: Math.round(15 * 1.04 ** floor * boss),
    def: Math.round(10 * 1.035 ** floor * boss),
    vel: Math.round(10 + floor * 0.15),
  }
}

const ENEMY_NAMES = [
  "Remanente Hueco",
  "Devorador de Ecos",
  "Sombra del Umbral",
  "Centinela Fracturado",
  "Aullido del Vacío",
  "Espectro de Ceniza",
  "Guardián Olvidado",
  "Larva Estelar",
]
const BOSS_NAMES = [
  "El Corazón del Abismo",
  "Arconte de la Espiral",
  "La Boca que Consume",
  "Señor del Piso Roto",
  "Eco Primordial",
]

export function enemyNameForFloor(floor: number): string {
  if (isBossFloor(floor)) return BOSS_NAMES[(floor / ESPIRAL_BOSS_EVERY - 1) % BOSS_NAMES.length]!
  return ENEMY_NAMES[floor % ENEMY_NAMES.length]!
}

// ─── RNG determinista (mulberry32 sembrado por string) ──────────────────────

/** Hash FNV-1a de 32 bits para convertir seeds string en enteros. */
export function hashSeed(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 — PRNG determinista, suficiente para combate reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Log de combate (playback determinista en cliente) ──────────────────────

export interface CombatantSnapshot {
  /** userEntityId para el equipo, "enemy" para el enemigo del piso. */
  id: string
  nombre: string
  rareza: Rareza | "enemy"
  arquetipo?: Arquetipo
  imageUrl?: string
  maxHp: number
  atk: number
  def: number
  vel: number
  ability: EspiralAbilityId
}

export type CombatLogEntry =
  | { kind: "combat_start"; floor: number; boss: boolean; enemyName: string }
  | { kind: "team_buff"; sourceId: string; ability: EspiralAbilityId; magnitude: number }
  | { kind: "defend"; actorId: string }
  | { kind: "focus"; actorId: string }
  | {
      kind: "attack"
      attackerId: string
      targetId: string
      damage: number
      crit: boolean
      ignoreDef: boolean
      targetHpAfter: number
    }
  | { kind: "ability_proc"; sourceId: string; ability: EspiralAbilityId }
  | { kind: "burn_tick"; targetId: string; damage: number; targetHpAfter: number }
  | { kind: "stunned"; targetId: string }
  | { kind: "death"; targetId: string }
  | { kind: "revive"; targetId: string; hpAfter: number }
  | { kind: "victory"; floor: number }
  | { kind: "defeat"; floor: number }

export interface FloorResult {
  victory: boolean
  floor: number
  boss: boolean
  combatants: CombatantSnapshot[]
  log: CombatLogEntry[]
  ecosDropped: number
}

// ─── Combate manual (turnos interactivos, server-authoritative) ──────────────

export type EspiralPlayerAction = "attack" | "defend" | "focus"

/** Defender: el daño recibido se reduce hasta el próximo turno del actor. */
export const ESPIRAL_DEFEND_REDUCTION = 0.5
/** Canalizar: el próximo ataque del actor pega más fuerte y critea más. */
export const ESPIRAL_FOCUS_MULT = 1.6
export const ESPIRAL_FOCUS_CRIT_BONUS = 0.15

/** Estado serializable de un combatiente a mitad de combate. */
export interface FighterPersistState {
  hp: number
  atkBuff: number
  defBuff: number
  stunTurns: number
  burnTurns: number
  burnDamage: number
  reviveUsed: boolean
  defending: boolean
  focused: boolean
}

/** Sesión de combate manual pendiente — persiste en el run entre requests.
 *  El RNG se reanuda de forma determinista re-derivando el stream con el seed
 *  del run y descartando `rngCursor` extracciones ya consumidas. */
export interface EspiralCombatSession {
  floor: number
  boss: boolean
  rngCursor: number
  round: number
  /** ids que aún no actuaron en la ronda actual (el primero es el actor en espera). */
  queue: string[]
  fighters: Record<string, FighterPersistState>
}

// ─── Energía ─────────────────────────────────────────────────────────────────

export const ESPIRAL_ENERGY_MAX = 10
export const ESPIRAL_ENERGY_REGEN_MS = 20 * 60 * 1000 // 1 punto cada 20 min
export const ESPIRAL_RUN_ENERGY_COST = 1

// ─── Ecos del Vacío ──────────────────────────────────────────────────────────

/** Probabilidad de drop de Ecos por piso normal limpiado (escala con el piso, cap 5%). */
export function ecosDropChance(floor: number): number {
  return Math.min(0.05, 0.02 + floor * 0.0005)
}

/** Cantidad de Ecos en un drop normal. */
export const ECOS_DROP_MIN = 1
export const ECOS_DROP_MAX = 3

/** Ecos garantizados al vencer un jefe (escala con la profundidad). */
export function bossEcosReward(floor: number): number {
  return 5 + Math.floor(floor / ESPIRAL_BOSS_EVERY)
}

export const ESPIRAL_REVIVE_COST_ECOS = 5
export const ESPIRAL_REVIVE_WINDOW_MS = 15 * 60 * 1000 // 15 min para revivir un run muerto

// ─── Altar del Eco (banner con techo en pulsar) ──────────────────────────────

export const ALTAR_ECO_COST_X1 = 10
export const ALTAR_ECO_COST_X10 = 90

/** Techo del banner: nunca eclipse/singularity. Su masa de probabilidad
 *  (0.0009 + 0.0001) se redistribuye hacia pulsar. */
export const ALTAR_ECO_BASE_PROB: Partial<Record<Rareza, number>> = {
  dust: 0.58,
  nebula: 0.25,
  comet: 0.1,
  nova: 0.04,
  pulsar: 0.03,
}

export const ALTAR_ECO_HARD_PITY = 49 // pull 50 garantiza pulsar
export const ALTAR_ECO_SOFT_PITY_START = 39 // soft pity desde el pull 40
export const ALTAR_ECO_SOFT_PITY_STEP = 0.08

// ─── Estado del run / progreso ───────────────────────────────────────────────

export interface EspiralActiveRun {
  teamUserEntityIds: string[]
  currentFloor: number
  seed: string
  status: "active" | "dead"
  deadAt?: string // ISO — inicio de la ventana de revive
  startedAt: string
  /** Ecos acumulados en este run (se bancan al retirarse/avanzar). */
  ecosEarned: number
}

export interface EspiralProgress {
  checkpointFloor: number
  bestFloorEver: number
  activeRun: EspiralActiveRun | null
}

// ─── Misiones ────────────────────────────────────────────────────────────────

export type EspiralMissionId =
  | "daily_clear_3"
  | "daily_reach_5"
  | "daily_boss"
  | "weekly_clear_25"
  | "weekly_boss_3"

export interface EspiralMissionDef {
  id: EspiralMissionId
  period: "daily" | "weekly"
  descripcion: string
  /** Métrica que la alimenta. */
  metric: "floors_cleared" | "max_floor_reached" | "bosses_defeated"
  target: number
  rewardEcos: number
}

export const ESPIRAL_MISSIONS: EspiralMissionDef[] = [
  {
    id: "daily_clear_3",
    period: "daily",
    descripcion: "Limpia 3 pisos de La Espiral",
    metric: "floors_cleared",
    target: 3,
    rewardEcos: 2,
  },
  {
    id: "daily_reach_5",
    period: "daily",
    descripcion: "Alcanza el piso 5 o superior en un run",
    metric: "max_floor_reached",
    target: 5,
    rewardEcos: 3,
  },
  {
    id: "daily_boss",
    period: "daily",
    descripcion: "Derrota a un jefe de La Espiral",
    metric: "bosses_defeated",
    target: 1,
    rewardEcos: 5,
  },
  {
    id: "weekly_clear_25",
    period: "weekly",
    descripcion: "Limpia 25 pisos durante la semana",
    metric: "floors_cleared",
    target: 25,
    rewardEcos: 15,
  },
  {
    id: "weekly_boss_3",
    period: "weekly",
    descripcion: "Derrota 3 jefes durante la semana",
    metric: "bosses_defeated",
    target: 3,
    rewardEcos: 20,
  },
]

/** Clave de periodo para el reset perezoso (sin cron): "2026-07-11" o "2026-W28". */
export function periodKeyFor(period: "daily" | "weekly", now: Date): string {
  if (period === "daily") return now.toISOString().slice(0, 10)
  // ISO week
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}
