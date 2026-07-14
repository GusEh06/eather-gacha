import { motion } from "framer-motion"
import { useMemo } from "react"

/**
 * Fondo parallax de La Espiral — se oscurece y se intensifica cada 10 pisos.
 * Capas: gradiente de profundidad + estrellas lentas + niebla que gira.
 * La paleta rota por tramo de profundidad para dar sensación física de descenso.
 */
const TIER_PALETTES = [
  { top: "#0d0a1f", glow: "#3b2a7a", accent: "#5a4bd4" }, // pisos 1-10: violeta
  { top: "#0a0d22", glow: "#1f3a8a", accent: "#2f6fe0" }, // 11-20: azul profundo
  { top: "#071a1c", glow: "#0f5a54", accent: "#12b8a0" }, // 21-30: abismo esmeralda
  { top: "#1a0713", glow: "#6a0f3a", accent: "#e0245e" }, // 31-40: carmesí
  { top: "#120716", glow: "#4a0a5e", accent: "#a020f0" }, // 41-50: púrpura vacío
  { top: "#050505", glow: "#3d3d10", accent: "#e8c50a" }, // 51+: oro del final
]

export function ParallaxBackground({ floor }: { floor: number }) {
  const tier = Math.min(Math.floor(Math.max(0, floor - 1) / 10), TIER_PALETTES.length - 1)
  const palette = TIER_PALETTES[tier]!
  // Más profundo = más oscuro
  const darkness = Math.min(0.55, tier * 0.09)

  const stars = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        top: `${(i * 53) % 100}%`,
        size: 1 + ((i * 7) % 3),
        duration: 3 + ((i * 11) % 5),
      })),
    []
  )

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Capa 1: gradiente de profundidad (anima el cambio de tramo) */}
      <motion.div
        animate={{
          background: `linear-gradient(180deg, ${palette.top} 0%, #050308 60%, #000 100%)`,
        }}
        transition={{ duration: 2 }}
        style={{ position: "absolute", inset: 0 }}
      />

      {/* Capa 2: resplandor central del vórtice */}
      <motion.div
        animate={{
          background: `radial-gradient(ellipse 70% 55% at 50% 60%, ${palette.glow}33 0%, transparent 70%)`,
        }}
        transition={{ duration: 2 }}
        style={{ position: "absolute", inset: 0 }}
      />

      {/* Capa 3: anillo en rotación lenta — la Espiral misma */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          left: "50%",
          top: "60%",
          width: "140vmax",
          height: "140vmax",
          marginLeft: "-70vmax",
          marginTop: "-70vmax",
          background: `conic-gradient(from 0deg, transparent 0%, ${palette.accent}0e 20%, transparent 45%, ${palette.accent}08 70%, transparent 100%)`,
          borderRadius: "50%",
        }}
      />

      {/* Capa 4: estrellas parpadeantes */}
      {stars.map((s) => (
        <motion.div
          key={s.id}
          animate={{ opacity: [0.15, 0.7, 0.15] }}
          transition={{ duration: s.duration, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#fff",
          }}
        />
      ))}

      {/* Capa 5: velo de oscuridad por profundidad */}
      <motion.div
        animate={{ opacity: darkness }}
        transition={{ duration: 2 }}
        style={{ position: "absolute", inset: 0, background: "#000" }}
      />
    </div>
  )
}
