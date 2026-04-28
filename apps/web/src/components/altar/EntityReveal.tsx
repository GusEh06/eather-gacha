import { motion } from "framer-motion"
import type { Rareza } from "../../../../../packages/shared/src/types"
import { RARITY_CONFIG, NON_BAZAAR_RARITIES } from "../../config/rarityConfig"
import { RarityBadge } from "./RarityBadge"
import type { InvokeResult } from "../../hooks/useInvoke"

interface EntityRevealProps {
  result: InvokeResult
  onContinue: () => void
  onListBazaar?: () => void
}

export function EntityReveal({ result, onContinue, onListBazaar }: EntityRevealProps) {
  const { entity } = result
  const rareza = entity.rareza as Rareza
  const cfg = RARITY_CONFIG[rareza]
  const canListBazaar = !NON_BAZAAR_RARITIES.includes(rareza)
  const isSingularity = rareza === "singularity"

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--bg-void)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      {/* Entity icon — squash & stretch entrance */}
      <motion.div
        initial={{ scale: 0.1, opacity: 0 }}
        animate={[
          { scaleX: 1.4, scaleY: 0.6, opacity: 1, transition: { duration: 0.08 } },
          { scaleX: 0.8, scaleY: 1.2, transition: { duration: 0.1 } },
          { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 280, damping: 18 } },
        ]}
        className={isSingularity ? "singularity-gradient entity-idle" : "entity-idle"}
        // @ts-ignore — CSS custom property on inline style
        style={{
          width: "180px",
          height: "180px",
          borderRadius: "50%",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "5rem",
          marginBottom: "1.75rem",
          border: `2px solid var(${cfg.cssVar})`,
          boxShadow: `0 0 24px var(${cfg.cssVar}), 0 0 48px rgba(0,0,0,0.5)`,
          "--rarity-color": `var(${cfg.cssVar})`,
        }}
      >
        {entity.imageUrl
          ? <img src={entity.imageUrl} alt={entity.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : cfg.icon
        }
      </motion.div>

      {/* Rarity */}
      <RarityBadge rareza={rareza} size="lg" />

      {/* Name */}
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "2rem",
          color: `var(${cfg.cssVar})`,
          letterSpacing: "0.1em",
          margin: "0.75rem 0 0.2rem",
        }}
      >
        {entity.nombre}
      </h2>

      {/* Arquetipo · Époc */}
      <p
        style={{
          color: "var(--text-secondary)",
          fontFamily: "var(--font-ui)",
          fontSize: "0.9rem",
          marginBottom: "1rem",
        }}
      >
        {entity.arquetipo} · {entity.epoca}
      </p>

      {/* Lore */}
      <p
        style={{
          color: "var(--text-secondary)",
          fontFamily: "var(--font-ui)",
          fontSize: "0.9rem",
          maxWidth: "420px",
          fontStyle: "italic",
          lineHeight: "1.65",
          marginBottom: "0.75rem",
        }}
      >
        &ldquo;{entity.descripcionLore}&rdquo;
      </p>

      {/* Eyes flavor */}
      <p
        style={{
          color: `var(${cfg.cssVar})`,
          fontFamily: "var(--font-display)",
          fontSize: "0.78rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: "2rem",
          opacity: 0.7,
        }}
      >
        {entity.descripcionOjos}
      </p>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
        {canListBazaar && (
          <button
            className="btn-primary"
            style={{
              background: "var(--bg-elevated)",
              border: `1px solid var(${cfg.cssVar})`,
              color: `var(${cfg.cssVar})`,
            }}
            onClick={onListBazaar}
          >
            List on Bazaar
          </button>
        )}
        <button className="btn-primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </motion.div>
  )
}
