import { motion } from "framer-motion"
import { ECOS_CONFIG } from "../../config/ecosConfig"

/**
 * Reveal de drop de Ecos del Vacío — mismo lenguaje visual que el reveal del
 * Altar (glow radial + pop con spring) pero en clave de moneda: sigilo verde
 * espectral con conteo. Se muestra embebido en la pantalla de victoria.
 */
export function EcosDropReveal({ amount }: { amount: number }) {
  return (
    <motion.div
      initial={{ scale: 0.3, opacity: 0, y: 24 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.4 }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.7rem",
        background: `${ECOS_CONFIG.color}14`,
        border: `1px solid ${ECOS_CONFIG.color}66`,
        borderRadius: "999px",
        padding: "0.55rem 1.6rem",
        backdropFilter: "blur(8px)",
        position: "relative",
        overflow: "visible",
      }}
    >
      {/* Pulso de aura */}
      <motion.div
        animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: "-8px",
          borderRadius: "999px",
          border: `1px solid ${ECOS_CONFIG.color}44`,
          pointerEvents: "none",
        }}
      />
      <motion.span
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{
          fontSize: "1.4rem",
          color: ECOS_CONFIG.color,
          filter: `drop-shadow(0 0 8px ${ECOS_CONFIG.color})`,
        }}
      >
        {ECOS_CONFIG.icon}
      </motion.span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: "1.3rem",
          color: ECOS_CONFIG.color,
          textShadow: `0 0 16px ${ECOS_CONFIG.color}88`,
        }}
      >
        +{amount}
      </span>
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "0.72rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: `${ECOS_CONFIG.color}cc`,
        }}
      >
        {ECOS_CONFIG.label}
      </span>
    </motion.div>
  )
}
