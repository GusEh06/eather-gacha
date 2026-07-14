import { useEffect, useRef, useState } from "react"
import { ECOS_CONFIG } from "../../config/ecosConfig"

interface EcosDisplayProps {
  amount: number
}

/**
 * Contador HUD de Ecos del Vacío — mismo tratamiento animado que
 * ShardsDisplay (interpolación + flare) pero en verde espectral, para que las
 * dos monedas se distingan de un vistazo.
 */
export function EcosDisplay({ amount }: EcosDisplayProps) {
  const [display, setDisplay] = useState(amount)
  const prevRef = useRef(amount)
  const valueRef = useRef<HTMLSpanElement | null>(null)
  const sigilRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const from = prevRef.current
    const to = amount
    if (from === to) return

    import("animejs").then((mod) => {
      const anime = mod.default
      const proxy = { v: from }
      anime({
        targets: proxy,
        v: to,
        duration: 650,
        easing: "easeOutCubic",
        round: 1,
        update: () => setDisplay(proxy.v),
      })

      if (valueRef.current) {
        anime.remove(valueRef.current)
        anime({
          targets: valueRef.current,
          scale: [
            { value: 1.18, duration: 140, easing: "easeOutQuad" },
            { value: 1, duration: 280, easing: "easeOutElastic(1, .6)" },
          ],
        })
      }

      if (sigilRef.current) {
        anime.remove(sigilRef.current)
        anime({
          targets: sigilRef.current,
          rotate: [{ value: -18, duration: 120 }, { value: 0, duration: 320 }],
          filter: [
            { value: `drop-shadow(0 0 12px ${ECOS_CONFIG.color})`, duration: 180 },
            { value: `drop-shadow(0 0 4px ${ECOS_CONFIG.colorDim})`, duration: 320 },
          ],
        })
      }
    })

    prevRef.current = to
  }, [amount])

  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        color: ECOS_CONFIG.color,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        fontSize: "1.25rem",
        letterSpacing: "0.06em",
        lineHeight: 1,
      }}
    >
      <span
        ref={sigilRef}
        aria-hidden="true"
        style={{
          fontSize: "1.05em",
          display: "inline-block",
          filter: `drop-shadow(0 0 4px ${ECOS_CONFIG.colorDim})`,
        }}
      >
        {ECOS_CONFIG.icon}
      </span>
      <span ref={valueRef} data-testid="ecos-display" style={{ display: "inline-block", minWidth: "2ch" }}>
        {display.toLocaleString("en-US")}
      </span>
    </span>
  )
}
