import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  ESPIRAL_ENERGY_MAX,
  ESPIRAL_ENERGY_REGEN_MS,
} from "../../../../../packages/shared/src/espiral"

interface EnergyIndicatorProps {
  current: number
  lastRegenAt: string
}

function fmt(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

/**
 * Pips de energía con cuenta regresiva al siguiente punto. El timer es
 * puramente cosmético (el servidor recalcula al gastar) — se reconcilia con
 * energyLastRegenAt en cada refetch.
 */
export function EnergyIndicator({ current, lastRegenAt }: EnergyIndicatorProps) {
  const [msLeft, setMsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (current >= ESPIRAL_ENERGY_MAX) {
      setMsLeft(null)
      return
    }
    const anchor = new Date(lastRegenAt).getTime()
    const tick = () => {
      const elapsed = (Date.now() - anchor) % ESPIRAL_ENERGY_REGEN_MS
      setMsLeft(ESPIRAL_ENERGY_REGEN_MS - elapsed)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [current, lastRegenAt])

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div style={{ display: "flex", gap: "0.3rem" }}>
        {Array.from({ length: ESPIRAL_ENERGY_MAX }, (_, i) => {
          const filled = i < current
          return (
            <motion.div
              key={i}
              initial={false}
              animate={{
                background: filled ? "#00e5ff" : "rgba(255,255,255,0.08)",
                boxShadow: filled ? "0 0 8px #00e5ff88" : "none",
                scale: filled ? 1 : 0.85,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              style={{
                width: "14px",
                height: "22px",
                clipPath: "polygon(50% 0%, 100% 30%, 78% 100%, 22% 100%, 0% 30%)",
              }}
            />
          )
        })}
      </div>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1rem",
          color: "#00e5ff",
          letterSpacing: "0.05em",
        }}
      >
        {current}/{ESPIRAL_ENERGY_MAX}
      </span>
      {msLeft !== null && (
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            letterSpacing: "0.06em",
          }}
        >
          +1 en {fmt(msLeft)}
        </span>
      )}
    </div>
  )
}
