import { AnimatePresence, motion } from "framer-motion"

/**
 * Contador de piso tipo odómetro: cada dígito rueda hacia arriba al cambiar,
 * como una máquina tragamonedas cósmica.
 */
export function FloorOdometer({ floor, color = "#7b2fff" }: { floor: number; color?: string }) {
  const digits = String(floor).split("")
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "0.5rem",
        fontFamily: "var(--font-display)",
      }}
    >
      <span
        style={{
          fontSize: "0.75rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
        }}
      >
        Piso
      </span>
      <div style={{ display: "flex", overflow: "hidden" }}>
        {digits.map((d, i) => (
          <div
            key={`slot-${digits.length - i}`}
            style={{ position: "relative", height: "2.6rem", overflow: "hidden" }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${d}-${floor}`}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                style={{
                  display: "inline-block",
                  fontSize: "2.4rem",
                  fontWeight: 900,
                  lineHeight: "2.6rem",
                  color,
                  textShadow: `0 0 24px ${color}88`,
                  minWidth: "1.4rem",
                  textAlign: "center",
                }}
              >
                {d}
              </motion.span>
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}
