import type { EntityDoc } from "../db/collections"
import {
  type CombatLogEntry,
  type CombatantSnapshot,
  type EntityStats,
  type EspiralCombatSession,
  type EspiralPlayerAction,
  type FighterPersistState,
  type FloorResult,
  ESPIRAL_ABILITIES,
  ESPIRAL_DEFEND_REDUCTION,
  ESPIRAL_FOCUS_CRIT_BONUS,
  ESPIRAL_FOCUS_MULT,
  ECOS_DROP_MAX,
  ECOS_DROP_MIN,
  bossEcosReward,
  ecosDropChance,
  enemyNameForFloor,
  enemyStatsForFloor,
  getEffectiveStats,
  getEspiralAbility,
  hashSeed,
  isBossFloor,
  mulberry32,
} from "../../../../packages/shared/src/espiral"
import type { Arquetipo, Rareza } from "../../../../packages/shared/src/types"

export interface TeamMemberInput {
  userEntityId: string
  entity: EntityDoc
}

interface Fighter {
  snapshot: CombatantSnapshot
  hp: number
  atkBuff: number // multiplicador acumulado (1 = sin buff)
  defBuff: number
  stunTurns: number
  burnTurns: number
  burnDamage: number
  reviveUsed: boolean
  defending: boolean
  focused: boolean
  isEnemy: boolean
}

const MAX_ROUNDS = 50

/**
 * Motor de UN piso de La Espiral, por pasos. Dos modos sobre la misma
 * matemática server-authoritative:
 *  - Auto (`resolveFloor`): corre completo y devuelve el log para playback.
 *  - Manual: `advanceUntilDecision()` corre turnos automáticos (enemigo,
 *    quemaduras, stuns) hasta que un miembro del equipo deba decidir;
 *    `applyPlayerAction()` resuelve esa decisión. El estado se serializa
 *    entre requests y el RNG se reanuda por cursor — mismo seed, mismo
 *    stream, imposible de manipular desde el cliente.
 */
export class FloorCombat {
  readonly floor: number
  readonly boss: boolean
  readonly log: CombatLogEntry[] = []
  private readonly fighters: Fighter[]
  private readonly enemy: Fighter
  private readonly rawRng: () => number
  private rngCursor = 0
  private round: number
  private queue: string[]
  private over = false

  constructor(team: TeamMemberInput[], floor: number, runSeed: string, resume?: EspiralCombatSession) {
    this.floor = floor
    this.boss = isBossFloor(floor)
    this.rawRng = mulberry32(hashSeed(`${runSeed}:${floor}`))

    this.fighters = team.map(({ userEntityId, entity }) => {
      const stats = getEffectiveStats({
        rareza: entity.rareza,
        arquetipo: entity.arquetipo,
        statsOverride: entity.statsOverride,
      })
      const ability = getEspiralAbility({
        rareza: entity.rareza,
        arquetipo: entity.arquetipo,
        espiralAbilityOverride: entity.espiralAbilityOverride as never,
      })
      return {
        snapshot: {
          id: userEntityId,
          nombre: entity.nombre,
          rareza: entity.rareza as Rareza,
          arquetipo: entity.arquetipo as Arquetipo,
          imageUrl: entity.imageUrl,
          maxHp: stats.hp,
          atk: stats.atk,
          def: stats.def,
          vel: stats.vel,
          ability,
        },
        hp: stats.hp,
        atkBuff: 1,
        defBuff: 1,
        stunTurns: 0,
        burnTurns: 0,
        burnDamage: 0,
        reviveUsed: false,
        defending: false,
        focused: false,
        isEnemy: false,
      }
    })

    const enemyStats: EntityStats = enemyStatsForFloor(floor)
    this.enemy = {
      snapshot: {
        id: "enemy",
        nombre: enemyNameForFloor(floor),
        rareza: "enemy",
        maxHp: enemyStats.hp,
        atk: enemyStats.atk,
        def: enemyStats.def,
        vel: enemyStats.vel,
        ability: "none",
      },
      hp: enemyStats.hp,
      atkBuff: 1,
      defBuff: 1,
      stunTurns: 0,
      burnTurns: 0,
      burnDamage: 0,
      reviveUsed: false,
      defending: false,
      focused: false,
      isEnemy: true,
    }

    if (resume) {
      // Reanudar: restaurar estado persistido y avanzar el RNG hasta el cursor
      this.round = resume.round
      this.queue = [...resume.queue]
      for (const f of this.all()) {
        const persisted = resume.fighters[f.snapshot.id]
        if (persisted) Object.assign(f, persisted)
      }
      for (let i = 0; i < resume.rngCursor; i++) this.rawRng()
      this.rngCursor = resume.rngCursor
    } else {
      this.round = 0
      this.queue = []
      this.log.push({ kind: "combat_start", floor, boss: this.boss, enemyName: this.enemy.snapshot.nombre })

      // Buffs de equipo al inicio (pulsar+)
      for (const f of this.fighters) {
        const def = ESPIRAL_ABILITIES[f.snapshot.ability]
        if (def.id === "team_atk_buff" && this.rng() < def.chance) {
          for (const ally of this.fighters) ally.atkBuff += def.magnitude
          this.log.push({ kind: "team_buff", sourceId: f.snapshot.id, ability: def.id, magnitude: def.magnitude })
        } else if (def.id === "team_def_buff" && this.rng() < def.chance) {
          for (const ally of this.fighters) ally.defBuff += def.magnitude
          this.log.push({ kind: "team_buff", sourceId: f.snapshot.id, ability: def.id, magnitude: def.magnitude })
        }
      }
    }
  }

  private rng(): number {
    this.rngCursor++
    return this.rawRng()
  }

  private all(): Fighter[] {
    return [...this.fighters, this.enemy]
  }

  private teamAlive(): boolean {
    return this.fighters.some((f) => f.hp > 0)
  }

  private byId(id: string): Fighter | undefined {
    return this.all().find((f) => f.snapshot.id === id)
  }

  isOver(): boolean {
    return this.over || this.enemy.hp <= 0 || !this.teamAlive()
  }

  get combatants(): CombatantSnapshot[] {
    return [...this.fighters.map((f) => f.snapshot), this.enemy.snapshot]
  }

  private dealDamage(attacker: Fighter, target: Fighter): void {
    const abilityDef = ESPIRAL_ABILITIES[attacker.snapshot.ability]
    const ignoreDef = abilityDef.id === "ignore_def"
    const variance = 0.9 + this.rng() * 0.2
    const critChance = 0.1 + (attacker.focused ? ESPIRAL_FOCUS_CRIT_BONUS : 0)
    const crit = this.rng() < critChance
    const focusMult = attacker.focused ? ESPIRAL_FOCUS_MULT : 1
    attacker.focused = false
    const effDef = ignoreDef ? 0 : target.snapshot.def * target.defBuff * 0.5
    let damage = Math.max(
      1,
      Math.round((attacker.snapshot.atk * attacker.atkBuff * focusMult * variance - effDef) * (crit ? 1.5 : 1))
    )
    if (target.defending) damage = Math.max(1, Math.round(damage * ESPIRAL_DEFEND_REDUCTION))
    target.hp = Math.max(0, target.hp - damage)
    this.log.push({
      kind: "attack",
      attackerId: attacker.snapshot.id,
      targetId: target.snapshot.id,
      damage,
      crit,
      ignoreDef,
      targetHpAfter: target.hp,
    })

    // Efectos de estado del atacante (nova+): stun/burn
    if (target.hp > 0 && abilityDef.id === "stun" && this.rng() < abilityDef.chance) {
      target.stunTurns = 1
      this.log.push({ kind: "ability_proc", sourceId: attacker.snapshot.id, ability: "stun" })
      this.log.push({ kind: "stunned", targetId: target.snapshot.id })
    }
    if (target.hp > 0 && abilityDef.id === "burn" && this.rng() < abilityDef.chance) {
      target.burnTurns = 2
      target.burnDamage = Math.max(1, Math.round(attacker.snapshot.atk * abilityDef.magnitude))
      this.log.push({ kind: "ability_proc", sourceId: attacker.snapshot.id, ability: "burn" })
    }

    if (target.hp <= 0) {
      // Renacer Singular: la primera caída revive con % de HP
      const targetAbility = ESPIRAL_ABILITIES[target.snapshot.ability]
      if (targetAbility.id === "one_time_revive" && !target.reviveUsed) {
        target.reviveUsed = true
        target.hp = Math.round(target.snapshot.maxHp * targetAbility.magnitude)
        this.log.push({ kind: "ability_proc", sourceId: target.snapshot.id, ability: "one_time_revive" })
        this.log.push({ kind: "revive", targetId: target.snapshot.id, hpAfter: target.hp })
      } else {
        this.log.push({ kind: "death", targetId: target.snapshot.id })
      }
    }
  }

  /**
   * Inicio de turno automático: reset de defensa, quemadura y stun.
   * Devuelve false si el actor perdió el turno (murió quemado o está aturdido).
   */
  private beginTurn(actor: Fighter): boolean {
    if (actor.hp <= 0 || this.isOver()) return false

    actor.defending = false

    if (actor.burnTurns > 0) {
      actor.burnTurns--
      actor.hp = Math.max(0, actor.hp - actor.burnDamage)
      this.log.push({
        kind: "burn_tick",
        targetId: actor.snapshot.id,
        damage: actor.burnDamage,
        targetHpAfter: actor.hp,
      })
      if (actor.hp <= 0) {
        this.log.push({ kind: "death", targetId: actor.snapshot.id })
        return false
      }
    }

    if (actor.stunTurns > 0) {
      actor.stunTurns--
      this.log.push({ kind: "stunned", targetId: actor.snapshot.id })
      return false
    }

    return true
  }

  /** Ataque estándar del actor (con proc de turno extra si aplica). */
  private performAttack(actor: Fighter): void {
    if (actor.isEnemy) {
      const living = this.fighters.filter((f) => f.hp > 0)
      if (living.length === 0) return
      const target = living[Math.floor(this.rng() * living.length)]!
      this.dealDamage(actor, target)
    } else {
      this.dealDamage(actor, this.enemy)
      const abilityDef = ESPIRAL_ABILITIES[actor.snapshot.ability]
      if (abilityDef.id === "extra_turn" && this.enemy.hp > 0 && this.rng() < abilityDef.chance) {
        this.log.push({ kind: "ability_proc", sourceId: actor.snapshot.id, ability: "extra_turn" })
        this.dealDamage(actor, this.enemy)
      }
    }
  }

  /**
   * Corre el combate hasta el fin o hasta que un miembro del equipo deba
   * decidir (solo si `interactive`). Devuelve el id del actor en espera,
   * o null si el combate terminó.
   */
  advanceUntilDecision(interactive: boolean): string | null {
    while (!this.isOver()) {
      if (this.queue.length === 0) {
        if (this.round >= MAX_ROUNDS) {
          this.over = true
          break
        }
        this.round++
        this.queue = this.all()
          .filter((f) => f.hp > 0)
          .sort((a, b) => b.snapshot.vel - a.snapshot.vel)
          .map((f) => f.snapshot.id)
      }

      const actorId = this.queue[0]!
      const actor = this.byId(actorId)

      if (!actor || actor.hp <= 0) {
        this.queue.shift()
        continue
      }

      if (!actor.isEnemy && interactive) {
        // El inicio de turno (quemadura/stun) se resuelve antes de preguntar
        if (!this.beginTurn(actor)) {
          this.queue.shift()
          continue
        }
        return actorId // ── punto de decisión: el jugador elige la acción ──
      }

      this.queue.shift()
      if (this.beginTurn(actor)) this.performAttack(actor)
    }
    return null
  }

  /** Resuelve la acción elegida para el actor en espera (modo manual). */
  applyPlayerAction(actorId: string, action: EspiralPlayerAction): void {
    if (this.queue[0] !== actorId) {
      throw new Error("Not this combatant's turn")
    }
    const actor = this.byId(actorId)
    if (!actor || actor.hp <= 0 || actor.isEnemy) throw new Error("Invalid actor")

    this.queue.shift()
    switch (action) {
      case "attack":
        this.performAttack(actor)
        break
      case "defend":
        actor.defending = true
        this.log.push({ kind: "defend", actorId })
        break
      case "focus":
        actor.focused = true
        this.log.push({ kind: "focus", actorId })
        break
    }
  }

  /** Cierra el combate: registra victory/defeat y calcula el drop de Ecos. */
  buildResult(): FloorResult {
    const victory = this.enemy.hp <= 0

    let ecosDropped = 0
    if (victory) {
      if (this.boss) {
        ecosDropped = bossEcosReward(this.floor)
      } else if (this.rng() < ecosDropChance(this.floor)) {
        ecosDropped = ECOS_DROP_MIN + Math.floor(this.rng() * (ECOS_DROP_MAX - ECOS_DROP_MIN + 1))
      }
      this.log.push({ kind: "victory", floor: this.floor })
    } else {
      this.log.push({ kind: "defeat", floor: this.floor })
    }

    return {
      victory,
      floor: this.floor,
      boss: this.boss,
      combatants: this.combatants,
      log: this.log,
      ecosDropped,
    }
  }

  serialize(): EspiralCombatSession {
    const fighters: Record<string, FighterPersistState> = {}
    for (const f of this.all()) {
      fighters[f.snapshot.id] = {
        hp: f.hp,
        atkBuff: f.atkBuff,
        defBuff: f.defBuff,
        stunTurns: f.stunTurns,
        burnTurns: f.burnTurns,
        burnDamage: f.burnDamage,
        reviveUsed: f.reviveUsed,
        defending: f.defending,
        focused: f.focused,
      }
    }
    return {
      floor: this.floor,
      boss: this.boss,
      rngCursor: this.rngCursor,
      round: this.round,
      queue: [...this.queue],
      fighters,
    }
  }

  /** Estado visible de HP/estados para que el cliente pinte al reanudar. */
  fighterStates(): Record<string, FighterPersistState> {
    return this.serialize().fighters
  }
}

/**
 * Resuelve UN piso completo en modo automático (comportamiento clásico):
 * mismo seed + mismo piso = mismo resultado, siempre.
 */
export function resolveFloor(team: TeamMemberInput[], floor: number, runSeed: string): FloorResult {
  const combat = new FloorCombat(team, floor, runSeed)
  combat.advanceUntilDecision(false)
  return combat.buildResult()
}
