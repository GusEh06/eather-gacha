import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ECOS_CONFIG } from "../config/ecosConfig"
import { RARITY_CONFIG } from "../config/rarityConfig"
import type { Rareza } from "../../../../packages/shared/src/types"
import { useAltarEcoPull, useAltarEcoState, type AltarEcoPullResponse } from "../hooks/useEspiral"
import { EntityReveal } from "../components/altar/EntityReveal"
import { X10Reveal } from "../components/altar/X10Reveal"
import { SparkCanvas } from "../components/shared/SparkCanvas"

export const Route = createFileRoute("/altar-eco")({ component: AltarEcoPage })

function AltarEcoPage() {
  const { data: state } = useAltarEcoState()
  const pullMutation = useAltarEcoPull()
  const [reveal, setReveal] = useState<AltarEcoPullResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handlePull(mode: "x1" | "x10") {
    setErrorMsg(null)
    pullMutation.mutate(mode, {
      onSuccess: (res) => setReveal(res),
      onError: (e) => setErrorMsg(e.message),
    })
  }

  // ── Reveal en curso: reutiliza el lenguaje visual del Altar principal ──
  if (reveal) {
    if (reveal.results.length === 1) {
      return <EntityReveal result={reveal.results[0]!} onContinue={() => setReveal(null)} />
    }
    return <X10Reveal results={reveal.results} onContinue={() => setReveal(null)} />
  }

  const pity = state?.espiralPityCounter ?? 0
  const hardPity = state?.hardPityAt ?? 50
  const pityPct = Math.min(100, (pity / hardPity) * 100)
  const ecos = state?.ecos ?? 0
  const costX1 = state?.costX1 ?? 10
  const costX10 = state?.costX10 ?? 90

  return (
    <div className="page" style={{ position: "relative", minHeight: "calc(100vh - 60px)", overflow: "hidden" }}>
      {/* Atmósfera verde espectral propia del Eco */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 60% 50% at 50% 35%, ${ECOS_CONFIG.color}12 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <SparkCanvas color={ECOS_CONFIG.color} mode="drift" density={0.7} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <h1 className="brutalist-title">Altar del Eco</h1>
        <div className="brutalist-subtitle">Donde el Vacío devuelve lo que consume</div>

        {/* Balance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
            marginTop: "1.6rem",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "1.7rem",
            color: ECOS_CONFIG.color,
            textShadow: `0 0 24px ${ECOS_CONFIG.color}66`,
          }}
        >
          <span style={{ filter: `drop-shadow(0 0 10px ${ECOS_CONFIG.color})` }}>{ECOS_CONFIG.icon}</span>
          {ecos.toLocaleString()}
          <span style={{ fontSize: "0.7rem", letterSpacing: "0.2em", color: `${ECOS_CONFIG.color}99`, alignSelf: "flex-end", paddingBottom: "0.4rem" }}>
            ECOS DEL VACÍO
          </span>
        </motion.div>

        {/* Techo del banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            marginTop: "1.2rem",
            maxWidth: "480px",
            fontFamily: "var(--font-ui)",
            fontSize: "0.82rem",
            lineHeight: 1.6,
            color: "var(--text-secondary)",
          }}
        >
          Este altar solo responde a los Ecos ganados en{" "}
          <Link to="/espiral" style={{ color: ECOS_CONFIG.color }}>
            La Espiral
          </Link>
          . Su techo es{" "}
          <span style={{ color: RARITY_CONFIG.pulsar.color, fontWeight: 700 }}>
            {RARITY_CONFIG.pulsar.icon} Pulsar
          </span>{" "}
          — Eclipse y Singularity solo emergen del Altar principal.
        </motion.div>

        {/* Pity */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ marginTop: "1.6rem", width: "min(420px, 90%)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-ui)", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
            <span>Piedad del Eco</span>
            <span>
              {pity}/{hardPity} — Pulsar garantizado
            </span>
          </div>
          <div style={{ height: "8px", background: "rgba(0,0,0,0.55)", borderRadius: "4px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
            <motion.div
              animate={{ width: `${pityPct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
              style={{
                height: "100%",
                background: `linear-gradient(90deg, ${ECOS_CONFIG.color}, ${RARITY_CONFIG.pulsar.color})`,
                boxShadow: `0 0 10px ${RARITY_CONFIG.pulsar.color}88`,
              }}
            />
          </div>
        </motion.div>

        {errorMsg && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: "#e0245e", fontFamily: "var(--font-ui)", fontWeight: 600, marginTop: "1rem" }}>
            {errorMsg}
          </motion.p>
        )}

        {/* Botones de invocación */}
        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
          <PullButton
            label="Invocar ×1"
            cost={costX1}
            disabled={ecos < costX1 || pullMutation.isPending}
            onClick={() => handlePull("x1")}
          />
          <PullButton
            label="Invocar ×10"
            cost={costX10}
            disabled={ecos < costX10 || pullMutation.isPending}
            onClick={() => handlePull("x10")}
            highlight
          />
        </div>

        <AnimatePresence>
          {pullMutation.isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ marginTop: "1.4rem", fontFamily: "var(--font-ui)", letterSpacing: "0.2em", textTransform: "uppercase", fontSize: "0.8rem", color: ECOS_CONFIG.color }}
            >
              El Vacío escucha…
            </motion.div>
          )}
        </AnimatePresence>

        {/* Probabilidades */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          style={{ display: "flex", gap: "1.1rem", marginTop: "2.4rem", flexWrap: "wrap", justifyContent: "center" }}
        >
          {Object.entries(state?.probabilities ?? {}).map(([rareza, prob]) => {
            const cfg = RARITY_CONFIG[rareza as Rareza]
            if (!cfg) return null
            return (
              <span key={rareza} style={{ fontFamily: "var(--font-ui)", fontSize: "0.72rem", color: cfg.color, letterSpacing: "0.06em" }}>
                {cfg.icon} {cfg.label} {(prob * 100).toFixed(prob < 0.01 ? 1 : 0)}%
              </span>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}

function PullButton({
  label,
  cost,
  disabled,
  onClick,
  highlight,
}: {
  label: string
  cost: number
  disabled: boolean
  onClick: () => void
  highlight?: boolean
}) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05, y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: "0.95rem",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "0.85rem 2.1rem",
        borderRadius: "8px",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        background: highlight
          ? `linear-gradient(135deg, ${ECOS_CONFIG.color}, ${ECOS_CONFIG.color}bb)`
          : "rgba(255,255,255,0.05)",
        color: highlight ? "#000" : ECOS_CONFIG.color,
        border: highlight ? "none" : `1px solid ${ECOS_CONFIG.color}66`,
        boxShadow: highlight && !disabled ? `0 0 26px ${ECOS_CONFIG.color}55` : "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.2rem",
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: "0.72rem", opacity: 0.85 }}>
        {ECOS_CONFIG.icon} {cost}
      </span>
    </motion.button>
  )
}
