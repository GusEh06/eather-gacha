import { useEffect, useRef, useState } from "react"

interface ShardsDisplayProps {
  amount: number
}

/**
 * HUD-grade Shards counter.
 *
 * Uses anime.js to interpolate the displayed integer between the previous and
 * the next value, plus a brief gold flare on the icon. This is the canonical
 * "magical" treatment for any Shard-mutation feedback in the app.
 */
export function ShardsDisplay({ amount }: ShardsDisplayProps) {
  const [display, setDisplay] = useState(amount)
  const prevRef = useRef(amount)
  const valueRef = useRef<HTMLSpanElement | null>(null)
  const sigilRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const from = prevRef.current
    const to   = amount
    if (from === to) return

    import("animejs").then((mod) => {
      const anime = mod.default
      const proxy = { v: from }
      anime({
        targets:    proxy,
        v:          to,
        duration:   650,
        easing:     "easeOutCubic",
        round:      1,
        update:     () => setDisplay(proxy.v),
      })

      if (valueRef.current) {
        anime.remove(valueRef.current)
        anime({
          targets: valueRef.current,
          scale:   [
            { value: 1.18, duration: 140, easing: "easeOutQuad" },
            { value: 1,    duration: 280, easing: "easeOutElastic(1, .6)" },
          ],
          color: [
            { value: "#ffd76b", duration: 180 },
            { value: "#f0a500", duration: 320 },
          ],
        })
      }

      if (sigilRef.current) {
        anime.remove(sigilRef.current)
        anime({
          targets: sigilRef.current,
          rotate:  [{ value: -18, duration: 120 }, { value: 0, duration: 320 }],
          filter: [
            { value: "drop-shadow(0 0 12px rgba(240,165,0,0.8))", duration: 180 },
            { value: "drop-shadow(0 0 4px rgba(240,165,0,0.4))",  duration: 320 },
          ],
        })
      }
    })

    prevRef.current = to
  }, [amount])

  const formatted = display.toLocaleString("en-US")

  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        color: "var(--accent-gold)",
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
          filter: "drop-shadow(0 0 4px rgba(240,165,0,0.4))",
        }}
      >
        ◈
      </span>
      <span ref={valueRef} style={{ display: "inline-block", minWidth: "2ch" }}>
        {formatted}
      </span>
    </span>
  )
}
