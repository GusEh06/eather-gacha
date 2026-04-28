import { useEffect, useRef } from "react"
import anime from "animejs"

/* ──────────────────────────────────────────────────────────────────────────
   LivingAtmosphere — animated background layer that lives behind the shell.
   It paints two kinds of "life":
     · Aether motes: tiny dots that drift slowly upward, fading in and out
     · Floating runes: faint Cinzel glyphs that breathe + drift sideways
   Built with anime.js per project rule (no framer-motion here).
   ────────────────────────────────────────────────────────────────────────── */

const RUNES = ["ᚠ", "ᚱ", "ᛟ", "ᛉ", "ᚦ", "ᛒ", "ᛇ", "ᛞ", "✦", "◈", "❖"]
const MOTE_COUNT = 28
const RUNE_COUNT = 7

interface LivingAtmosphereProps {
  /** Route key — used to lightly bias colors / density per route. */
  route: string
}

export function LivingAtmosphere({ route }: LivingAtmosphereProps) {
  const layerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    const motes = layer.querySelectorAll<HTMLSpanElement>(".aether-mote")
    const runes = layer.querySelectorAll<HTMLSpanElement>(".aether-rune-float")

    /* Motes: each mote runs its own loop, randomized so the field never
       lines up. We pick durations between 7 and 18 seconds so movement
       reads as "drift", not "scroll". */
    motes.forEach((mote) => {
      const startX = Math.random() * 100
      const startY = 100 + Math.random() * 20
      mote.style.left = `${startX}%`
      mote.style.top = `${startY}%`

      anime({
        targets:    mote,
        translateY: [`0%`, `-${110 + Math.random() * 30}vh`],
        translateX: [`0px`, `${(Math.random() - 0.5) * 80}px`],
        opacity: [
          { value: 0,                duration: 0 },
          { value: 0.55 + Math.random() * 0.35, duration: 1400, easing: "easeOutQuad" },
          { value: 0,                duration: 1800, easing: "easeInQuad" },
        ],
        duration:   7000 + Math.random() * 11000,
        delay:      Math.random() * 8000,
        easing:     "linear",
        loop:       true,
      })
    })

    /* Runes: breathe (opacity/scale), drift sideways, slight rotation. */
    runes.forEach((rune, i) => {
      anime({
        targets:    rune,
        translateX: [
          { value: (Math.random() - 0.5) * 60, duration: 9000 + i * 800 },
          { value: 0,                          duration: 9000 + i * 800 },
        ],
        translateY: [
          { value: (Math.random() - 0.5) * 30, duration: 11000 + i * 700 },
          { value: 0,                          duration: 11000 + i * 700 },
        ],
        rotate: [
          { value: (Math.random() - 0.5) * 14, duration: 10000 },
          { value: 0,                          duration: 10000 },
        ],
        opacity: [
          { value: 0.18 + Math.random() * 0.12, duration: 4000 },
          { value: 0.05,                        duration: 4000 },
        ],
        scale: [
          { value: 1.08, duration: 4000 },
          { value: 0.95, duration: 4000 },
        ],
        easing:    "easeInOutSine",
        loop:      true,
        direction: "alternate",
        delay:     i * 600,
      })
    })

    return () => {
      anime.remove(motes)
      anime.remove(runes)
    }
  }, [])

  return (
    <div
      ref={layerRef}
      className="aether-living"
      data-route={route}
      aria-hidden="true"
    >
      {Array.from({ length: MOTE_COUNT }).map((_, i) => (
        <span
          key={`m${i}`}
          className="aether-mote"
          style={{
            // size varies for parallax feel
            ["--mote-size" as string]: `${2 + Math.random() * 3}px`,
            ["--mote-blur" as string]: `${Math.random() * 1.5}px`,
          }}
        />
      ))}
      {Array.from({ length: RUNE_COUNT }).map((_, i) => (
        <span
          key={`r${i}`}
          className="aether-rune-float"
          style={{
            top:        `${10 + Math.random() * 80}%`,
            left:       `${5 + Math.random() * 90}%`,
            fontSize:   `${1.4 + Math.random() * 1.6}rem`,
          }}
        >
          {RUNES[i % RUNES.length]}
        </span>
      ))}
    </div>
  )
}
