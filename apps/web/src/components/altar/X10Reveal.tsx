import { motion } from "framer-motion"
import type { Rareza } from "../../../../../packages/shared/src/types"
import { RARITY_CONFIG } from "../../config/rarityConfig"
import { RarityBadge } from "./RarityBadge"
import type { InvokeResult } from "../../hooks/useInvoke"

/** Single card — flips in after `delay` seconds */
function EntityCard({ result, delay }: { result: InvokeResult; delay: number }) {
  const rareza = result.entity.rareza as Rareza
  const cfg = RARITY_CONFIG[rareza]

  return (
    <motion.div
      initial={{ rotateY: 180, opacity: 0.2 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      style={{
        width: "120px",
        height: "165px",
        borderRadius: "8px",
        border: `2px solid var(${cfg.cssVar})`,
        boxShadow: `0 0 10px color-mix(in srgb, var(${cfg.cssVar}) 40%, transparent)`,
        background: "var(--bg-elevated)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.6rem 0.4rem",
        gap: "0.4rem",
      }}
    >
      <span style={{ fontSize: "2.4rem" }}>{cfg.icon}</span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "0.62rem",
          color: `var(${cfg.cssVar})`,
          letterSpacing: "0.04em",
          textAlign: "center",
          lineHeight: "1.3",
        }}
      >
        {result.entity.nombre}
      </span>
      <RarityBadge rareza={rareza} size="sm" />
    </motion.div>
  )
}

interface X10RevealProps {
  results: InvokeResult[]
  onContinue: () => void
}

export function X10Reveal({ results, onContinue }: X10RevealProps) {
  // Continue button appears after all cards have flipped
  const continueDelay = results.length * 0.3 + 0.6

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        minHeight: "100vh",
        background: "var(--bg-void)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.75rem",
          color: "var(--accent-aether)",
          letterSpacing: "0.1em",
          marginBottom: "2rem",
        }}
      >
        Entities Summoned
      </h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.85rem",
          justifyContent: "center",
          maxWidth: "720px",
          marginBottom: "2.5rem",
        }}
      >
        {results.map((result, i) => (
          <EntityCard key={result.userEntityId} result={result} delay={i * 0.3} />
        ))}
      </div>

      <motion.button
        className="btn-primary"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: continueDelay }}
        style={{ fontSize: "1rem", padding: "0.75rem 2rem" }}
        onClick={onContinue}
      >
        Continue
      </motion.button>
    </motion.div>
  )
}
