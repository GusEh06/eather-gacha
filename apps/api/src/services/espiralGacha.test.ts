import { describe, test, expect } from "bun:test"
import { calcularRarezaEspiral, actualizarPityEspiral } from "./espiralGacha"

// La Espiral: tests del motor del Altar del Eco (techo pulsar + pity propio)

describe("calcularRarezaEspiral — techo del banner", () => {
  test("NUNCA retorna eclipse ni singularity (techo pulsar)", () => {
    for (let i = 0; i < 20_000; i++) {
      const r = calcularRarezaEspiral(Math.floor(Math.random() * 60))
      expect(["dust", "nebula", "comet", "nova", "pulsar"]).toContain(r)
    }
  })
})

describe("calcularRarezaEspiral — hard pity", () => {
  test("con pity=49 siempre retorna pulsar", () => {
    for (let i = 0; i < 500; i++) {
      expect(calcularRarezaEspiral(49)).toBe("pulsar")
    }
  })

  test("con pity>49 sigue garantizando pulsar", () => {
    for (let i = 0; i < 100; i++) {
      expect(calcularRarezaEspiral(80)).toBe("pulsar")
    }
  })
})

describe("calcularRarezaEspiral — soft pity", () => {
  test("en zona de soft pity (>=40) la tasa de pulsar sube notablemente", () => {
    const N = 10_000
    let base = 0
    let soft = 0
    for (let i = 0; i < N; i++) {
      if (calcularRarezaEspiral(5) === "pulsar") base++
      if (calcularRarezaEspiral(45) === "pulsar") soft++
    }
    // Base ~3%, en pity 45 ~3% + 5*8% = ~43%
    expect(soft / N).toBeGreaterThan((base / N) * 4)
  })
})

describe("actualizarPityEspiral", () => {
  test("pulsar resetea el contador", () => {
    expect(actualizarPityEspiral("pulsar", 30)).toBe(0)
  })

  test("cualquier otra rareza incrementa el contador", () => {
    expect(actualizarPityEspiral("dust", 10)).toBe(11)
    expect(actualizarPityEspiral("nova", 0)).toBe(1)
  })
})
