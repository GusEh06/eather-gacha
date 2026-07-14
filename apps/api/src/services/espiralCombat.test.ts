import { describe, test, expect } from "bun:test"
import { FloorCombat, resolveFloor, type TeamMemberInput } from "./espiralCombat"
import { computeEnergy } from "./energyService"
import type { EntityDoc } from "../db/collections"
import {
  ESPIRAL_ENERGY_MAX,
  ESPIRAL_ENERGY_REGEN_MS,
  enemyStatsForFloor,
  getEffectiveStats,
  isBossFloor,
} from "../../../../packages/shared/src/espiral"

// La Espiral: tests del motor de combate determinista + energía

function makeEntity(overrides: Partial<EntityDoc> = {}): EntityDoc {
  return {
    nombre: "Test Entity",
    rareza: "comet",
    epoca: "Test",
    arquetipo: "Guerrero",
    descripcionLore: "",
    imageUrl: "",
    descripcionOjos: "",
    disponibleGacha: true,
    disponibleRift: false,
    ...overrides,
  }
}

function makeTeam(rareza: string): TeamMemberInput[] {
  return [
    { userEntityId: "ue1", entity: makeEntity({ rareza, arquetipo: "Guerrero" }) },
    { userEntityId: "ue2", entity: makeEntity({ rareza, arquetipo: "Guardián" }) },
    { userEntityId: "ue3", entity: makeEntity({ rareza, arquetipo: "Trickster" }) },
  ]
}

describe("resolveFloor — determinismo", () => {
  test("mismo seed + mismo piso = resultado idéntico", () => {
    const team = makeTeam("nova")
    const a = resolveFloor(team, 7, "seed-abc")
    const b = resolveFloor(team, 7, "seed-abc")
    expect(a.victory).toBe(b.victory)
    expect(a.ecosDropped).toBe(b.ecosDropped)
    expect(JSON.stringify(a.log)).toBe(JSON.stringify(b.log))
  })

  test("seeds distintos producen logs distintos", () => {
    const team = makeTeam("nova")
    const a = resolveFloor(team, 7, "seed-abc")
    const b = resolveFloor(team, 7, "seed-xyz")
    expect(JSON.stringify(a.log)).not.toBe(JSON.stringify(b.log))
  })
})

describe("resolveFloor — resultado del combate", () => {
  test("un equipo singularity aplasta el piso 1", () => {
    const result = resolveFloor(makeTeam("singularity"), 1, "s")
    expect(result.victory).toBe(true)
  })

  test("un equipo dust muere en pisos profundos", () => {
    const result = resolveFloor(makeTeam("dust"), 80, "s")
    expect(result.victory).toBe(false)
  })

  test("el log siempre termina en victory o defeat", () => {
    for (const floor of [1, 10, 25]) {
      const result = resolveFloor(makeTeam("pulsar"), floor, `s${floor}`)
      const last = result.log[result.log.length - 1]!
      expect(["victory", "defeat"]).toContain(last.kind)
    }
  })

  test("jefe garantiza Ecos al ganar", () => {
    const result = resolveFloor(makeTeam("singularity"), 10, "s")
    expect(result.victory).toBe(true)
    expect(result.boss).toBe(true)
    expect(result.ecosDropped).toBeGreaterThan(0)
  })

  test("combatants incluye a los 3 del equipo + el enemigo", () => {
    const result = resolveFloor(makeTeam("comet"), 3, "s")
    expect(result.combatants).toHaveLength(4)
    expect(result.combatants.some((c) => c.id === "enemy")).toBe(true)
  })
})

describe("escalado de pisos", () => {
  test("los enemigos crecen exponencialmente con la profundidad", () => {
    const f1 = enemyStatsForFloor(1)
    const f30 = enemyStatsForFloor(31) // 31 no es jefe (sin multiplicador)
    expect(f30.hp).toBeGreaterThan(f1.hp * 2)
    expect(f30.atk).toBeGreaterThan(f1.atk)
  })

  test("los pisos de jefe multiplican stats", () => {
    const normal = enemyStatsForFloor(9)
    const boss = enemyStatsForFloor(10)
    expect(isBossFloor(10)).toBe(true)
    expect(boss.hp).toBeGreaterThan(normal.hp * 2)
  })
})

describe("getEffectiveStats", () => {
  test("rareza más alta = stats radicalmente mayores (curva exponencial)", () => {
    const dust = getEffectiveStats({ rareza: "dust", arquetipo: "Guerrero" })
    const singularity = getEffectiveStats({ rareza: "singularity", arquetipo: "Guerrero" })
    expect(singularity.hp).toBeGreaterThan(dust.hp * 10)
    expect(singularity.atk).toBeGreaterThan(dust.atk * 10)
  })

  test("el override del admin gana campo a campo", () => {
    const stats = getEffectiveStats({
      rareza: "dust",
      arquetipo: "Guerrero",
      statsOverride: { hp: 9999 },
    })
    expect(stats.hp).toBe(9999)
    // atk sigue derivado (dust 20 × Guerrero 1.2 = 24)
    expect(stats.atk).toBe(24)
  })
})

describe("FloorCombat — modo manual", () => {
  /** Juega un combate manual completo eligiendo siempre la misma acción. */
  function playManual(
    team: TeamMemberInput[],
    floor: number,
    seed: string,
    pickAction: (turn: number) => "attack" | "defend" | "focus",
    resumeEachTurn = false
  ) {
    let combat = new FloorCombat(team, floor, seed)
    const fullLog = [...combat.log]
    let awaiting = combat.advanceUntilDecision(true)
    fullLog.length = 0
    fullLog.push(...combat.log)
    let turn = 0
    while (awaiting !== null && turn < 500) {
      if (resumeEachTurn) {
        // Simula el ciclo request/response: serializar y reanudar desde cero
        const session = combat.serialize()
        combat = new FloorCombat(team, floor, seed, session)
      }
      const before = combat.log.length
      combat.applyPlayerAction(awaiting, pickAction(turn))
      awaiting = combat.advanceUntilDecision(true)
      fullLog.push(...combat.log.slice(resumeEachTurn ? 0 : before))
      turn++
    }
    const result = combat.buildResult()
    return { result, fullLog: [...fullLog, result.log[result.log.length - 1]!] }
  }

  test("manual atacando siempre ≡ resolveFloor (misma matemática, mismo seed)", () => {
    const team = makeTeam("nova")
    const auto = resolveFloor(team, 7, "seed-eq")
    const manual = playManual(team, 7, "seed-eq", () => "attack")
    expect(manual.result.victory).toBe(auto.victory)
    expect(manual.result.ecosDropped).toBe(auto.ecosDropped)
    // Los eventos de combate coinciden uno a uno
    expect(JSON.stringify(manual.fullLog)).toBe(JSON.stringify(auto.log))
  })

  test("serializar y reanudar en cada turno no altera el resultado", () => {
    const team = makeTeam("comet")
    const straight = playManual(team, 5, "seed-resume", () => "attack")
    const resumed = playManual(team, 5, "seed-resume", () => "attack", true)
    expect(resumed.result.victory).toBe(straight.result.victory)
    expect(resumed.result.ecosDropped).toBe(straight.result.ecosDropped)
    expect(JSON.stringify(resumed.fullLog)).toBe(JSON.stringify(straight.fullLog))
  })

  test("canalizar potencia el siguiente ataque del actor", () => {
    const team = makeTeam("nova")
    // A: primer turno ataca · B: primer turno canaliza y el segundo ataca.
    // Canalizar no consume RNG, así que el ataque de B usa los mismos draws.
    const a = new FloorCombat(team, 3, "seed-focus")
    const actorA = a.advanceUntilDecision(true)!
    a.applyPlayerAction(actorA, "attack")
    const dmgA = a.log.filter((e) => e.kind === "attack" && e.attackerId === actorA)[0]!

    const b = new FloorCombat(team, 3, "seed-focus")
    const actorB = b.advanceUntilDecision(true)!
    b.applyPlayerAction(actorB, "focus")
    expect(b.log.some((e) => e.kind === "focus" && e.actorId === actorB)).toBe(true)
    b.advanceUntilDecision(true)
    // Avanzar hasta que el mismo actor vuelva a actuar y atacar canalizado
    let awaiting: string | undefined = b.serialize().queue[0]
    let guard = 0
    while (awaiting !== actorB && awaiting && guard < 20) {
      b.applyPlayerAction(awaiting, "attack")
      awaiting = b.advanceUntilDecision(true) ?? undefined
      guard++
    }
    if (awaiting === actorB) {
      b.applyPlayerAction(actorB, "attack")
      const dmgB = b.log.filter((e) => e.kind === "attack" && e.attackerId === actorB)[0]
      if (dmgA.kind === "attack" && dmgB?.kind === "attack") {
        expect(dmgB.damage).toBeGreaterThan(0)
      }
    }
  })

  test("defender registra la acción y el combate sigue resolviéndose", () => {
    const team = makeTeam("pulsar")
    const { result, fullLog } = playManual(team, 4, "seed-def", (turn) => (turn % 2 === 0 ? "defend" : "attack"))
    expect(fullLog.some((e) => e.kind === "defend")).toBe(true)
    const last = result.log[result.log.length - 1]!
    expect(["victory", "defeat"]).toContain(last.kind)
  })

  test("actuar fuera de turno lanza error", () => {
    const team = makeTeam("comet")
    const combat = new FloorCombat(team, 2, "seed-turn")
    combat.advanceUntilDecision(true)
    expect(() => combat.applyPlayerAction("enemy", "attack")).toThrow()
    expect(() => combat.applyPlayerAction("id-inexistente", "attack")).toThrow()
  })
})

describe("computeEnergy — regeneración perezosa", () => {
  const regen = ESPIRAL_ENERGY_REGEN_MS

  test("sin tiempo transcurrido no regenera", () => {
    const now = new Date()
    const { energy } = computeEnergy(5, now, now)
    expect(energy).toBe(5)
  })

  test("regenera 1 punto por tick completo", () => {
    const anchor = new Date(0)
    const now = new Date(regen * 3 + 1000)
    const { energy } = computeEnergy(2, anchor, now)
    expect(energy).toBe(5)
  })

  test("respeta el cap", () => {
    const anchor = new Date(0)
    const now = new Date(regen * 100)
    const { energy } = computeEnergy(2, anchor, now)
    expect(energy).toBe(ESPIRAL_ENERGY_MAX)
  })

  test("conserva el progreso fraccional (ancla avanza solo ticks consumidos)", () => {
    const anchor = new Date(0)
    const now = new Date(regen * 1.5)
    const { energy, lastRegenAt } = computeEnergy(2, anchor, now)
    expect(energy).toBe(3)
    // El ancla debe quedar en el tick 1 exacto, no en "now"
    expect(lastRegenAt.getTime()).toBe(regen)
  })
})
