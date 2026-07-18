import { randomBytes } from "node:crypto"
import type { Db } from "mongodb"
import type { Context } from "hono"
import {
  ObjectId,
  entitiesCol,
  espiralProgressCol,
  userEntitiesCol,
  usersCol,
  type EspiralProgressDoc,
} from "../db/collections"
import { refreshEnergy, spendEnergy } from "./energyService"
import { FloorCombat, resolveFloor, type TeamMemberInput } from "./espiralCombat"
import { recordEcosTransaction } from "./ecosTransactions"
import { recordMissionMetrics } from "./espiralMissions"
import { logAudit } from "./audit"
import {
  ESPIRAL_REVIVE_COST_ECOS,
  ESPIRAL_REVIVE_WINDOW_MS,
  ESPIRAL_RUN_ENERGY_COST,
  isBossFloor,
  type CombatLogEntry,
  type CombatantSnapshot,
  type EspiralPlayerAction,
  type FighterPersistState,
  type FloorResult,
} from "../../../../packages/shared/src/espiral"

export class EspiralError extends Error {
  status: number
  extra?: Record<string, unknown>
  constructor(message: string, status: number, extra?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

const TEAM_SIZE = 3

async function getOrCreateProgress(db: Db, clerkId: string): Promise<EspiralProgressDoc> {
  const col = espiralProgressCol(db)
  const existing = await col.findOne({ userId: clerkId })
  if (existing) return existing
  const doc: EspiralProgressDoc = {
    userId: clerkId,
    checkpointFloor: 0,
    bestFloorEver: 0,
    activeRun: null,
    updatedAt: new Date(),
  }
  await col.insertOne(doc)
  return doc
}

/** Expira runs muertos fuera de la ventana de revive (limpieza perezosa). */
function pruneExpiredDeadRun(progress: EspiralProgressDoc): EspiralProgressDoc {
  const run = progress.activeRun
  if (run && run.status === "dead" && run.deadAt) {
    if (Date.now() - run.deadAt.getTime() > ESPIRAL_REVIVE_WINDOW_MS) {
      return { ...progress, activeRun: null }
    }
  }
  return progress
}

export interface EspiralStateResult {
  energyCurrent: number
  energyLastRegenAt: string
  ecos: number
  checkpointFloor: number
  bestFloorEver: number
  activeRun: {
    teamUserEntityIds: string[]
    currentFloor: number
    status: "active" | "dead"
    deadAt?: string
    ecosEarned: number
    pendingCombat: boolean
    reviveWindowMsLeft?: number
  } | null
}

/** GET /espiral/state — energía fresca + progreso + run activo. */
export async function getEspiralState(db: Db, clerkId: string): Promise<EspiralStateResult> {
  const user = await refreshEnergy(db, clerkId)
  if (!user) throw new EspiralError("User not found", 404)

  let progress = await getOrCreateProgress(db, clerkId)
  const pruned = pruneExpiredDeadRun(progress)
  if (pruned.activeRun !== progress.activeRun) {
    await espiralProgressCol(db).updateOne(
      { userId: clerkId },
      { $set: { activeRun: null, updatedAt: new Date() } }
    )
    progress = pruned
  }

  const run = progress.activeRun
  return {
    energyCurrent: user.energyCurrent ?? 0,
    energyLastRegenAt: (user.energyLastRegenAt ?? new Date()).toISOString(),
    ecos: user.ecos ?? 0,
    checkpointFloor: progress.checkpointFloor,
    bestFloorEver: progress.bestFloorEver,
    activeRun: run
      ? {
          teamUserEntityIds: run.teamUserEntityIds.map((id) => id.toString()),
          currentFloor: run.currentFloor,
          status: run.status,
          deadAt: run.deadAt?.toISOString(),
          ecosEarned: run.ecosEarned,
          pendingCombat: Boolean(run.combat),
          reviveWindowMsLeft:
            run.status === "dead" && run.deadAt
              ? Math.max(0, ESPIRAL_REVIVE_WINDOW_MS - (Date.now() - run.deadAt.getTime()))
              : undefined,
        }
      : null,
  }
}

/**
 * POST /espiral/run/start — valida propiedad del equipo (3 entidades),
 * deduce 1 energía atómicamente y arranca desde checkpoint + 1.
 */
export async function startRun(
  db: Db,
  clerkId: string,
  teamUserEntityIds: string[],
  c: Context | null
): Promise<{ currentFloor: number; energyCurrent: number }> {
  if (
    !Array.isArray(teamUserEntityIds) ||
    teamUserEntityIds.length !== TEAM_SIZE ||
    new Set(teamUserEntityIds).size !== TEAM_SIZE
  ) {
    throw new EspiralError(`Team must be exactly ${TEAM_SIZE} distinct entities`, 400)
  }

  let teamObjectIds: ObjectId[]
  try {
    teamObjectIds = teamUserEntityIds.map((id) => new ObjectId(id))
  } catch {
    throw new EspiralError("Invalid entity id", 400)
  }

  // Propiedad: las 3 instancias deben pertenecer al usuario (server-authoritative)
  const owned = await userEntitiesCol(db)
    .find({ _id: { $in: teamObjectIds }, ownerId: clerkId })
    .toArray()
  if (owned.length !== TEAM_SIZE) {
    throw new EspiralError("Team contains entities you do not own", 403)
  }

  let progress = await getOrCreateProgress(db, clerkId)
  progress = pruneExpiredDeadRun(progress)
  if (progress.activeRun && progress.activeRun.status === "active") {
    throw new EspiralError("A run is already active — advance, retreat or die first", 409)
  }

  // Energía: refresh perezoso + deducción atómica
  const user = await refreshEnergy(db, clerkId)
  if (!user) throw new EspiralError("User not found", 404)
  const remaining = await spendEnergy(db, clerkId, ESPIRAL_RUN_ENERGY_COST)
  if (remaining === null) {
    throw new EspiralError("Insufficient energy", 402, {
      energyCurrent: user.energyCurrent ?? 0,
      needed: ESPIRAL_RUN_ENERGY_COST,
    })
  }

  const startFloor = progress.checkpointFloor + 1
  const seed = randomBytes(16).toString("hex")

  await espiralProgressCol(db).updateOne(
    { userId: clerkId },
    {
      $set: {
        activeRun: {
          teamUserEntityIds: teamObjectIds,
          currentFloor: startFloor,
          seed,
          status: "active" as const,
          startedAt: new Date(),
          ecosEarned: 0,
        },
        updatedAt: new Date(),
      },
    }
  )

  await logAudit(db, c, {
    userId: clerkId,
    action: "espiral.run_start",
    result: "success",
    details: { startFloor, team: teamUserEntityIds },
  })

  return { currentFloor: startFloor, energyCurrent: remaining }
}

export interface AdvanceResult {
  result: FloorResult
  currentFloor: number
  checkpointFloor: number
  bestFloorEver: number
  ecos: number
  runStatus: "active" | "dead"
  reviveWindowMsLeft?: number
}

type ActiveRun = NonNullable<EspiralProgressDoc["activeRun"]>

/** Carga el equipo del run con sus entidades (stats server-side, nunca del cliente). */
async function loadTeam(db: Db, clerkId: string, run: ActiveRun): Promise<TeamMemberInput[]> {
  const userEntities = await userEntitiesCol(db)
    .find({ _id: { $in: run.teamUserEntityIds }, ownerId: clerkId })
    .toArray()
  if (userEntities.length !== run.teamUserEntityIds.length) {
    // Alguna entidad fue vendida en el Bazaar a mitad de run
    await espiralProgressCol(db).updateOne(
      { userId: clerkId },
      { $set: { activeRun: null, updatedAt: new Date() } }
    )
    throw new EspiralError("Team no longer valid (entity sold?) — run aborted", 409)
  }

  const entityDocs = await entitiesCol(db)
    .find({ _id: { $in: userEntities.map((ue) => ue.entityId) } })
    .toArray()
  const entityMap = new Map(entityDocs.map((e) => [e._id!.toString(), e]))

  return userEntities.map((ue) => {
    const entity = entityMap.get(ue.entityId.toString())
    if (!entity) throw new EspiralError("Entity catalog corrupted", 500)
    return { userEntityId: ue._id!.toString(), entity }
  })
}

/**
 * Liquida el resultado de un piso (compartido entre modo auto y manual).
 * Victoria: avanza piso, checkpoint en pisos de jefe, acredita Ecos, misiones.
 * Derrota: el run pasa a "dead" y abre la ventana de revive de 15 min.
 * En ambos casos limpia cualquier sesión de combate pendiente.
 */
async function settleFloorResult(
  db: Db,
  clerkId: string,
  progress: EspiralProgressDoc,
  run: ActiveRun,
  result: FloorResult,
  c: Context | null
): Promise<AdvanceResult> {
  const floor = result.floor
  const col = espiralProgressCol(db)
  const users = usersCol(db)
  let newCheckpoint = progress.checkpointFloor
  let ecosBalance = 0

  if (result.victory) {
    if (isBossFloor(floor)) newCheckpoint = Math.max(newCheckpoint, floor)
    const bestFloorEver = Math.max(progress.bestFloorEver, floor)

    await col.updateOne(
      { userId: clerkId },
      {
        $set: {
          checkpointFloor: newCheckpoint,
          bestFloorEver,
          "activeRun.currentFloor": floor + 1,
          "activeRun.ecosEarned": run.ecosEarned + result.ecosDropped,
          "activeRun.combat": null,
          updatedAt: new Date(),
        },
      }
    )

    // Acreditar Ecos inmediatamente (drop bancado al ganar el piso)
    if (result.ecosDropped > 0) {
      const updated = await users.findOneAndUpdate(
        { clerkId },
        { $inc: { ecos: result.ecosDropped } },
        { returnDocument: "after" }
      )
      ecosBalance = updated?.ecos ?? 0
      await recordEcosTransaction(db, {
        userId: clerkId,
        type: result.boss ? "boss_drop" : "espiral_drop",
        amount: result.ecosDropped,
        balanceAfter: ecosBalance,
        description: result.boss
          ? `Jefe derrotado en el piso ${floor} de La Espiral`
          : `Ecos hallados en el piso ${floor} de La Espiral`,
      })
    } else {
      const u = await users.findOne({ clerkId })
      ecosBalance = u?.ecos ?? 0
    }

    // Métricas de misiones (nunca lanza)
    await recordMissionMetrics(db, clerkId, {
      floors_cleared: 1,
      max_floor_reached: floor,
      bosses_defeated: result.boss ? 1 : 0,
    })

    return {
      result,
      currentFloor: floor + 1,
      checkpointFloor: newCheckpoint,
      bestFloorEver,
      ecos: ecosBalance,
      runStatus: "active",
    }
  }

  // Derrota: run pasa a "dead" — ventana de revive de 15 min
  const deadAt = new Date()
  await col.updateOne(
    { userId: clerkId },
    {
      $set: {
        "activeRun.status": "dead" as const,
        "activeRun.deadAt": deadAt,
        "activeRun.combat": null,
        updatedAt: new Date(),
      },
    }
  )
  await logAudit(db, c, {
    userId: clerkId,
    action: "espiral.run_death",
    result: "success",
    details: { floor },
  })

  const u = await users.findOne({ clerkId })
  return {
    result,
    currentFloor: floor,
    checkpointFloor: progress.checkpointFloor,
    bestFloorEver: progress.bestFloorEver,
    ecos: u?.ecos ?? 0,
    runStatus: "dead",
    reviveWindowMsLeft: ESPIRAL_REVIVE_WINDOW_MS,
  }
}

async function requireActiveRun(db: Db, clerkId: string) {
  const progress = await getOrCreateProgress(db, clerkId)
  const run = progress.activeRun
  if (!run || run.status !== "active") {
    throw new EspiralError("No active run — start one first", 409)
  }
  return { progress, run }
}

/**
 * POST /espiral/run/advance (modo auto) — resuelve UN piso completo.
 * Descarta cualquier combate manual pendiente (lo reemplaza el resultado).
 */
export async function advanceFloor(db: Db, clerkId: string, c: Context | null): Promise<AdvanceResult> {
  const { progress, run } = await requireActiveRun(db, clerkId)
  if (run.combat) {
    throw new EspiralError("A manual combat is in progress — resolve it first", 409)
  }
  const team = await loadTeam(db, clerkId, run)
  const result = resolveFloor(team, run.currentFloor, run.seed)
  return settleFloorResult(db, clerkId, progress, run, result, c)
}

// ─── Combate manual ──────────────────────────────────────────────────────────

export interface ManualCombatPending {
  pending: true
  floor: number
  boss: boolean
  combatants: CombatantSnapshot[]
  /** Entradas de log NUEVAS desde la última respuesta (playback incremental). */
  log: CombatLogEntry[]
  /** id del miembro del equipo que debe elegir acción. */
  awaiting: string
  /** Estado actual de HP/estados por combatiente (para reanudar tras un refresh). */
  fighters: Record<string, FighterPersistState>
}

export type ManualAdvanceResult = ManualCombatPending | (AdvanceResult & { pending: false })

async function persistCombatSession(db: Db, clerkId: string, combat: FloorCombat): Promise<void> {
  await espiralProgressCol(db).updateOne(
    { userId: clerkId },
    { $set: { "activeRun.combat": combat.serialize(), updatedAt: new Date() } }
  )
}

/**
 * POST /espiral/run/advance con { mode: "manual" } — abre el combate del piso
 * en modo interactivo. Si ya hay un combate pendiente, devuelve su estado
 * actual (idempotente: sobrevive a refreshes del cliente).
 */
export async function advanceFloorManual(
  db: Db,
  clerkId: string,
  c: Context | null
): Promise<ManualAdvanceResult> {
  const { progress, run } = await requireActiveRun(db, clerkId)
  const team = await loadTeam(db, clerkId, run)

  // Reanudar sesión pendiente sin tocar el motor (el log ya lo tiene el cliente)
  if (run.combat) {
    const combat = new FloorCombat(team, run.combat.floor, run.seed, run.combat)
    const awaiting = run.combat.queue[0]
    if (!awaiting) {
      // Sesión corrupta — descartarla y regenerar el piso desde cero
      await espiralProgressCol(db).updateOne(
        { userId: clerkId },
        { $set: { "activeRun.combat": null, updatedAt: new Date() } }
      )
    } else {
      return {
        pending: true,
        floor: run.combat.floor,
        boss: run.combat.boss,
        combatants: combat.combatants,
        log: [],
        awaiting,
        fighters: combat.fighterStates(),
      }
    }
  }

  const combat = new FloorCombat(team, run.currentFloor, run.seed)
  const awaiting = combat.advanceUntilDecision(true)

  if (awaiting === null) {
    // El combate terminó sin decisiones (p. ej. equipo aniquilado antes de actuar)
    const result = combat.buildResult()
    const settled = await settleFloorResult(db, clerkId, progress, run, result, c)
    return { ...settled, pending: false }
  }

  await persistCombatSession(db, clerkId, combat)
  return {
    pending: true,
    floor: combat.floor,
    boss: combat.boss,
    combatants: combat.combatants,
    log: combat.log,
    awaiting,
    fighters: combat.fighterStates(),
  }
}

const PLAYER_ACTIONS: EspiralPlayerAction[] = ["attack", "defend", "focus"]

/**
 * POST /espiral/run/action — resuelve la acción del actor en espera y corre
 * el combate hasta la próxima decisión o el final del piso.
 */
export async function combatAction(
  db: Db,
  clerkId: string,
  actorId: string,
  action: EspiralPlayerAction,
  c: Context | null
): Promise<ManualAdvanceResult> {
  if (!PLAYER_ACTIONS.includes(action)) {
    throw new EspiralError("action must be attack, defend or focus", 400)
  }
  const { progress, run } = await requireActiveRun(db, clerkId)
  if (!run.combat) {
    throw new EspiralError("No manual combat in progress", 409)
  }
  if (run.combat.queue[0] !== actorId) {
    throw new EspiralError("Not this combatant's turn", 409, { awaiting: run.combat.queue[0] })
  }

  const team = await loadTeam(db, clerkId, run)
  const combat = new FloorCombat(team, run.combat.floor, run.seed, run.combat)

  combat.applyPlayerAction(actorId, action)
  const awaiting = combat.advanceUntilDecision(true)

  if (awaiting === null) {
    const result = combat.buildResult()
    const settled = await settleFloorResult(db, clerkId, progress, run, result, c)
    // El log de esta respuesta son solo las entradas nuevas (el motor reanudado
    // arranca con log vacío) — el cliente ya reprodujo las anteriores.
    return { ...settled, pending: false }
  }

  await persistCombatSession(db, clerkId, combat)
  return {
    pending: true,
    floor: combat.floor,
    boss: combat.boss,
    combatants: combat.combatants,
    log: combat.log,
    awaiting,
    fighters: combat.fighterStates(),
  }
}

/**
 * POST /espiral/run/retreat — retirada voluntaria: banca lo ganado y termina.
 * No crea checkpoint ad-hoc (el checkpoint solo avanza en pisos de jefe).
 */
export async function retreat(db: Db, clerkId: string, c: Context | null): Promise<{ ecosEarned: number }> {
  const progress = await getOrCreateProgress(db, clerkId)
  const run = progress.activeRun
  if (!run || run.status !== "active") {
    throw new EspiralError("No active run to retreat from", 409)
  }

  await espiralProgressCol(db).updateOne(
    { userId: clerkId },
    { $set: { activeRun: null, updatedAt: new Date() } }
  )
  await logAudit(db, c, {
    userId: clerkId,
    action: "espiral.run_retreat",
    result: "success",
    details: { floor: run.currentFloor, ecosEarned: run.ecosEarned },
  })
  return { ecosEarned: run.ecosEarned }
}

/**
 * POST /espiral/run/revive — paga Ecos para resucitar el run muerto (dentro
 * de la ventana de 15 min) y seguir desde el mismo piso sin gastar energía.
 */
export async function reviveRun(
  db: Db,
  clerkId: string,
  c: Context | null
): Promise<{ currentFloor: number; ecos: number }> {
  const progress = await getOrCreateProgress(db, clerkId)
  const run = progress.activeRun
  if (!run || run.status !== "dead" || !run.deadAt) {
    throw new EspiralError("No dead run to revive", 409)
  }
  if (Date.now() - run.deadAt.getTime() > ESPIRAL_REVIVE_WINDOW_MS) {
    await espiralProgressCol(db).updateOne(
      { userId: clerkId },
      { $set: { activeRun: null, updatedAt: new Date() } }
    )
    throw new EspiralError("Revive window expired", 410)
  }

  // Deducción atómica de Ecos (mismo patrón que shards en performInvoke)
  const users = usersCol(db)
  const updated = await users.findOneAndUpdate(
    { clerkId, ecos: { $gte: ESPIRAL_REVIVE_COST_ECOS } },
    { $inc: { ecos: -ESPIRAL_REVIVE_COST_ECOS } },
    { returnDocument: "after" }
  )
  if (!updated) {
    const u = await users.findOne({ clerkId })
    throw new EspiralError("Insufficient Ecos", 402, {
      needed: ESPIRAL_REVIVE_COST_ECOS,
      have: u?.ecos ?? 0,
    })
  }

  await espiralProgressCol(db).updateOne(
    { userId: clerkId },
    {
      $set: {
        "activeRun.status": "active" as const,
        "activeRun.combat": null,
        updatedAt: new Date(),
      },
      $unset: { "activeRun.deadAt": "" },
    }
  )

  await recordEcosTransaction(db, {
    userId: clerkId,
    type: "revive",
    amount: -ESPIRAL_REVIVE_COST_ECOS,
    balanceAfter: updated.ecos ?? 0,
    description: `Renacer en el piso ${run.currentFloor} de La Espiral`,
  })
  await logAudit(db, c, {
    userId: clerkId,
    action: "espiral.run_revive",
    result: "success",
    details: { floor: run.currentFloor, cost: ESPIRAL_REVIVE_COST_ECOS },
  })

  return { currentFloor: run.currentFloor, ecos: updated.ecos ?? 0 }
}
