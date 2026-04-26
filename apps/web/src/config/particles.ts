/**
 * tsParticles burst configs per rarity.
 * Each config fires a one-shot radial burst from the center of the screen.
 * Import `rarityParticleConfig` and pass `rarityParticleConfig[rareza]` to
 * the <Particles> component's `options` prop.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const burst = (color: string, count: number): Record<string, any> => ({
  background: { color: { value: "transparent" } },
  fullScreen: { enable: true, zIndex: 20 },
  detectRetina: true,
  emitters: {
    direction: "none",
    life: { count: 1, duration: 0.25 },
    rate: { delay: 0, quantity: count },
    size: { width: 0, height: 0 },
    position: { x: 50, y: 50 },
  },
  particles: {
    color: { value: color },
    shape: { type: "circle" },
    opacity: { value: { min: 0.4, max: 1 } },
    size: { value: { min: 2, max: 5 } },
    move: {
      enable: true,
      speed: { min: 3, max: 9 },
      direction: "none",
      random: true,
      straight: false,
      outModes: { default: "destroy" },
    },
    life: { duration: { sync: false, value: 1.5 }, count: 1 },
    number: { value: 0 },
  },
})

export const rarityParticleConfig: Record<string, Record<string, unknown>> = {
  dust:        burst("#8a8a8a", 15),
  nebula:      burst("#4caf50", 20),
  comet:       burst("#2196f3", 30),
  nova:        burst("#9c27b0", 40),
  pulsar:      burst("#f0a500", 55),
  eclipse:     burst("#c0392b", 70),
  singularity: burst(["#ff0080", "#ff8c00", "#ffe100", "#00ff88", "#00cfff", "#7b2fff", "#ff0080"], 90),
}
