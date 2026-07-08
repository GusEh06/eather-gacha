import { describe, test, expect } from "bun:test"
import { calcularRareza, actualizarPity } from "./gacha"

// P-11: tests unitarios del motor de gacha y sistema de pity

describe("calcularRareza — hard pity", () => {
  test("con pityCounter=89 siempre retorna pulsar", () => {
    for (let i = 0; i < 500; i++) {
      expect(calcularRareza(89, 0)).toBe("pulsar")
    }
  })

  test("con pityCounter>89 sigue garantizando pulsar", () => {
    for (let i = 0; i < 100; i++) {
      expect(calcularRareza(120, 0)).toBe("pulsar")
    }
  })

  test("con pityMythicCounter=179 siempre retorna eclipse o singularity", () => {
    for (let i = 0; i < 500; i++) {
      const r = calcularRareza(0, 179)
      expect(["eclipse", "singularity"]).toContain(r)
    }
  })

  test("el mythic pity tiene prioridad sobre el pity de pulsar", () => {
    for (let i = 0; i < 200; i++) {
      const r = calcularRareza(89, 179)
      expect(["eclipse", "singularity"]).toContain(r)
    }
  })
})

describe("calcularRareza — soft pity", () => {
  test("en zona de soft pity (>=70) la tasa de pulsar sube notablemente", () => {
    const N = 10_000
    let basePulsar = 0
    let softPulsar = 0
    for (let i = 0; i < N; i++) {
      if (calcularRareza(10, 0) === "pulsar") basePulsar++
      if (calcularRareza(80, 0) === "pulsar") softPulsar++
    }
    // base ~2.9%; en pity 80 la prob es 0.029 + 11*0.06 ≈ 69%
    expect(basePulsar / N).toBeLessThan(0.06)
    expect(softPulsar / N).toBeGreaterThan(0.5)
  })
})

describe("calcularRareza — distribución estadística", () => {
  test("10,000 simulaciones sin pity dan distribuciones dentro de tolerancia", () => {
    const N = 10_000
    const counts: Record<string, number> = {}
    for (let i = 0; i < N; i++) {
      const r = calcularRareza(0, 0)
      counts[r] = (counts[r] ?? 0) + 1
    }

    // Valores esperados (base, sin pity): dust 58%, nebula 25%, comet 10%,
    // nova 4%, pulsar 2.9%, eclipse 0.09%, singularity 0.01%
    const expectRate = (rareza: string, expected: number, tolerance: number) => {
      const actual = (counts[rareza] ?? 0) / N
      expect(Math.abs(actual - expected)).toBeLessThan(tolerance)
    }

    expectRate("dust", 0.5809, 0.05)
    expectRate("nebula", 0.25, 0.05)
    expectRate("comet", 0.10, 0.05)
    expectRate("nova", 0.04, 0.05)
    expectRate("pulsar", 0.029, 0.05)
    // Las rarezas míticas son demasiado raras para asertar % con N=10k;
    // solo verificamos que no estén infladas.
    expect((counts["eclipse"] ?? 0) / N).toBeLessThan(0.01)
    expect((counts["singularity"] ?? 0) / N).toBeLessThan(0.005)
  })

  test("todas las rarezas retornadas son válidas", () => {
    const valid = ["dust", "nebula", "comet", "nova", "pulsar", "eclipse", "singularity"]
    for (let i = 0; i < 1000; i++) {
      expect(valid).toContain(calcularRareza(i % 90, i % 180))
    }
  })
})

describe("actualizarPity", () => {
  test("una rareza común incrementa ambos contadores", () => {
    expect(actualizarPity("dust" as any, 5, 10)).toEqual({
      newPityCounter: 6,
      newPityMythicCounter: 11,
    })
    expect(actualizarPity("comet" as any, 0, 0)).toEqual({
      newPityCounter: 1,
      newPityMythicCounter: 1,
    })
  })

  test("pulsar resetea pityCounter pero no el mythic", () => {
    expect(actualizarPity("pulsar" as any, 88, 100)).toEqual({
      newPityCounter: 0,
      newPityMythicCounter: 101,
    })
  })

  test("eclipse resetea ambos contadores", () => {
    expect(actualizarPity("eclipse" as any, 88, 178)).toEqual({
      newPityCounter: 0,
      newPityMythicCounter: 0,
    })
  })

  test("singularity resetea ambos contadores", () => {
    expect(actualizarPity("singularity" as any, 42, 99)).toEqual({
      newPityCounter: 0,
      newPityMythicCounter: 0,
    })
  })

  test("garantía dura: nunca se superan 90 pulls sin pulsar", () => {
    // Simula 1000 pulls encadenados y verifica el invariante del pity
    let pity = 0
    let mythicPity = 0
    for (let i = 0; i < 1000; i++) {
      const r = calcularRareza(pity, mythicPity)
      const next = actualizarPity(r as any, pity, mythicPity)
      pity = next.newPityCounter
      mythicPity = next.newPityMythicCounter
      expect(pity).toBeLessThanOrEqual(90)
      expect(mythicPity).toBeLessThanOrEqual(180)
    }
  })
})
