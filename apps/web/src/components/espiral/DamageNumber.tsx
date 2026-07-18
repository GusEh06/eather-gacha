import { motion } from "framer-motion"

export interface FloatingNumber {
  id: number
  value: number
  crit: boolean
  /** "damage" rojo/blanco · "burn" naranja · "heal" verde */
  kind: "damage" | "burn" | "heal"
  /** Posición relativa (%) dentro del contenedor del objetivo. */
  offsetX: number
}

const KIND_COLOR: Record<FloatingNumber["kind"], string> = {
  damage: "#ffffff",
  burn: "#ff7b3d",
  heal: "#3ddc97",
}

/**
 * Número de daño flotante — sube y se desvanece con spring. Los críticos son
 * más grandes, dorados y con un pop de escala extra.
 */
export function DamageNumber({ num }: { num: FloatingNumber }) {
  const color = num.crit ? "#ffd76b" : KIND_COLOR[num.kind]
  return (
    <motion.span
      initial={{ opacity: 0, y: 0, scale: num.crit ? 0.4 : 0.7 }}
      animate={{ opacity: [0, 1, 1, 0], y: -64, scale: num.crit ? [0.4, 1.5, 1.2] : 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
      style={{
        position: "absolute",
        top: "18%",
        left: `${50 + num.offsetX}%`,
        transform: "translateX(-50%)",
        fontFamily: "var(--font-display)",
        fontWeight: 900,
        fontSize: num.crit ? "2.2rem" : "1.4rem",
        color,
        textShadow: `0 0 12px ${color}aa, 0 2px 4px #000`,
        pointerEvents: "none",
        zIndex: 30,
        whiteSpace: "nowrap",
      }}
    >
      {num.kind === "heal" ? "+" : "−"}
      {num.value.toLocaleString()}
      {num.crit && <span style={{ fontSize: "0.6em", marginLeft: 4 }}>CRIT!</span>}
    </motion.span>
  )
}
