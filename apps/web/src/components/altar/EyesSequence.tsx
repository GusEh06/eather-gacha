import { motion } from "framer-motion"
import type { Rareza } from "../../../../../packages/shared/src/types"
import { RARITY_CONFIG } from "../../config/rarityConfig"

// Stable positions for up to 5 eye-pairs
const EYE_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 50, y: 42 },  // center
  { x: 28, y: 58 },  // left mid
  { x: 72, y: 58 },  // right mid
  { x: 18, y: 30 },  // far left top
  { x: 82, y: 30 },  // far right top
]

const FLAVOR_TEXT: Partial<Record<Rareza, string>> = {
  eclipse:     "From blood and shadow, it was born…",
  singularity: "The end of all things watches you.",
}

interface EyesSequenceProps {
  rareza: Rareza
}

export function EyesSequence({ rareza }: EyesSequenceProps) {
  const cfg = RARITY_CONFIG[rareza]
  const positions = EYE_POSITIONS.slice(0, cfg.eyePairs)

  const isEclipse     = rareza === "eclipse"
  const isSingularity = rareza === "singularity"

  const eyeAnimation =
    isEclipse     ? "eclipseFlicker 0.72s ease-in-out infinite" :
    isSingularity ? "singHueCycle 1.8s linear infinite"        :
    undefined

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000",
        overflow: "hidden",
        zIndex: 50,
      }}
    >
      {positions.map((pos, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.7, 1] }}
          transition={{ delay: i * 0.35, duration: 0.45 }}
          style={{
            position: "absolute",
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {/*
            Separate inner div owns the ongoing CSS animation so it never
            conflicts with framer-motion's opacity on the outer motion.div.
            eclipseFlicker → opacity loop (OK here, framer-motion is done)
            singHueCycle   → filter loop (no opacity conflict at all)
          */}
          <div style={{ display: "flex", gap: "14px", animation: eyeAnimation }}>
            {/* Left eye */}
            <div
              style={{
                width: 18,
                height: 9,
                borderRadius: "50%",
                background: `var(${cfg.cssVar})`,
                boxShadow: `0 0 10px var(${cfg.cssVar}), 0 0 20px var(${cfg.cssVar})`,
              }}
            />
            {/* Right eye */}
            <div
              style={{
                width: 18,
                height: 9,
                borderRadius: "50%",
                background: `var(${cfg.cssVar})`,
                boxShadow: `0 0 10px var(${cfg.cssVar}), 0 0 20px var(${cfg.cssVar})`,
              }}
            />
          </div>
        </motion.div>
      ))}

      {/* Flavor text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        style={{
          position: "absolute",
          bottom: "18%",
          width: "100%",
          textAlign: "center",
          color: `var(${cfg.cssVar})`,
          fontFamily: "var(--font-display)",
          fontSize: "1.1rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          opacity: 0.85,
          animation: isSingularity ? "singHueCycle 2.2s linear infinite" : undefined,
        }}
      >
        {FLAVOR_TEXT[rareza] ?? "Something stirs in the void…"}
      </motion.p>
    </div>
  )
}
