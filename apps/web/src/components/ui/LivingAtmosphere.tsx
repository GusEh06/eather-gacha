import { useEffect, useRef, useState } from "react"

/* ──────────────────────────────────────────────────────────────────────────
   LivingAtmosphere — full-screen animated background with multiple layers:
     · Aether motes:    tiny rising dots that drift upward (particle dust)
     · Floating runes:  Cinzel glyphs that breathe, drift, and rotate
     · Ember sparks:    brief flashes that pop and vanish (energy bursts)
     · Nebula orbs:     large, slow, faint blobs that pulse color
   Density is controlled by the `density` prop — higher = more life.
   anime.js loaded lazily to avoid SSR issues with Vite 8.
   ────────────────────────────────────────────────────────────────────────── */

const RUNES = ["ᚠ", "ᚱ", "ᛟ", "ᛉ", "ᚦ", "ᛒ", "ᛇ", "ᛞ", "✦", "◈", "❖", "ᛗ", "ᚢ", "ᚨ", "ᛃ", "ᛈ"]

/* ── Base counts (density=1) ── */
const BASE_MOTES   = 28
const BASE_RUNES   = 14
const BASE_EMBERS  = 10
const BASE_ORBS    = 3

interface LivingAtmosphereProps {
  route?: string
  /** Visual density multiplier — 1 = default, 4 = x4 life, 5 = x5 life */
  density?: number
}

export function LivingAtmosphere({ route = "altar", density = 1 }: LivingAtmosphereProps) {
  const layerRef = useRef<HTMLDivElement | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  const moteCount  = Math.round(BASE_MOTES  * density)
  const runeCount  = Math.round(BASE_RUNES  * density)
  const emberCount = Math.round(BASE_EMBERS * density)
  const orbCount   = Math.round(BASE_ORBS   * density)

  useEffect(() => { setIsMounted(true) }, [])

  useEffect(() => {
    if (!isMounted) return
    const layer = layerRef.current
    if (!layer) return

    let cancelled = false

    import("animejs").then((mod) => {
      if (cancelled) return
      const anime = mod.default

      /* ── MOTES (rising dust particles) ── */
      const motes = layer.querySelectorAll<HTMLSpanElement>(".aether-mote")
      motes.forEach((mote) => {
        const startX = Math.random() * 100
        const startY = 100 + Math.random() * 20
        mote.style.left = `${startX}%`
        mote.style.top  = `${startY}%`

        anime({
          targets:    mote,
          translateY: [`0%`, `-${110 + Math.random() * 40}vh`],
          translateX: [`0px`, `${(Math.random() - 0.5) * 120}px`],
          opacity: [
            { value: 0,   duration: 0 },
            { value: 0.5 + Math.random() * 0.45, duration: 1200, easing: "easeOutQuad" },
            { value: 0,   duration: 1600, easing: "easeInQuad" },
          ],
          duration: 5000 + Math.random() * 10000,
          delay:    Math.random() * 6000,
          easing:   "linear",
          loop:     true,
        })
      })

      /* ── RUNES (rising glyphs — drift upward like motes, with breathing) ── */
      const runes = layer.querySelectorAll<HTMLSpanElement>(".aether-rune-float")
      runes.forEach((rune, i) => {
        const startX = Math.random() * 100
        const startY = 90 + Math.random() * 20
        rune.style.left = `${startX}%`
        rune.style.top  = `${startY}%`

        anime({
          targets: rune,
          translateY: [`0%`, `-${90 + Math.random() * 40}vh`],
          translateX: [`0px`, `${(Math.random() - 0.5) * 120}px`],
          rotate: [
            { value: (Math.random() - 0.5) * 30, duration: 6000 + Math.random() * 4000 },
            { value: (Math.random() - 0.5) * -20, duration: 6000 + Math.random() * 4000 },
          ],
          opacity: [
            { value: 0, duration: 0 },
            { value: 0.3 + Math.random() * 0.35, duration: 2500, easing: "easeOutQuad" },
            { value: 0, duration: 2000, easing: "easeInQuad" },
          ],
          scale: [
            { value: 0.7, duration: 0 },
            { value: 1.1 + Math.random() * 0.3, duration: 4000 },
            { value: 0.8, duration: 3000 },
          ],
          easing:    "linear",
          loop:      true,
          delay:     Math.random() * 3000,
        })
      })

      /* ── EMBERS (brief flash sparks) ── */
      const embers = layer.querySelectorAll<HTMLSpanElement>(".aether-ember")
      embers.forEach((ember) => {
        const loop = () => {
          if (cancelled) return
          ember.style.left = `${Math.random() * 100}%`
          ember.style.top  = `${Math.random() * 100}%`

          anime({
            targets: ember,
            scale:   [0, 1.2 + Math.random(), 0],
            opacity: [0, 0.7 + Math.random() * 0.3, 0],
            duration: 800 + Math.random() * 1400,
            delay:    Math.random() * 4000,
            easing:   "easeOutExpo",
            complete: loop,
          })
        }
        loop()
      })

      /* ── NEBULA ORBS (large slow pulsing blobs) ── */
      const orbs = layer.querySelectorAll<HTMLSpanElement>(".aether-orb")
      orbs.forEach((orb) => {
        anime({
          targets: orb,
          translateX: [
            { value: (Math.random() - 0.5) * 150, duration: 18000 + Math.random() * 12000 },
            { value: 0,                            duration: 18000 + Math.random() * 12000 },
          ],
          translateY: [
            { value: (Math.random() - 0.5) * 100, duration: 20000 + Math.random() * 10000 },
            { value: 0,                            duration: 20000 + Math.random() * 10000 },
          ],
          scale: [
            { value: 0.6 + Math.random() * 0.6, duration: 10000 + Math.random() * 6000 },
            { value: 1.1 + Math.random() * 0.4, duration: 10000 + Math.random() * 6000 },
          ],
          opacity: [
            { value: 0.04 + Math.random() * 0.06, duration: 8000 + Math.random() * 4000 },
            { value: 0.01,                         duration: 8000 + Math.random() * 4000 },
          ],
          easing:    "easeInOutSine",
          loop:      true,
          direction: "alternate",
          delay:     Math.random() * 5000,
        })
      })
    })

    return () => { cancelled = true }
  }, [isMounted])

  /* ── Palette colors per route for orbs ── */
  const orbColors: Record<string, string[]> = {
    altar:      ["rgba(123,47,255,0.08)", "rgba(33,150,243,0.06)", "rgba(192,57,43,0.05)"],
    bazaar:     ["rgba(240,165,0,0.08)", "rgba(192,57,43,0.06)", "rgba(123,47,255,0.04)"],
    rift:       ["rgba(33,150,243,0.10)", "rgba(123,47,255,0.07)", "rgba(0,255,255,0.05)"],
    vault:      ["rgba(240,165,0,0.10)", "rgba(255,230,160,0.06)", "rgba(123,47,255,0.04)"],
    collection: ["rgba(123,47,255,0.06)", "rgba(60,60,80,0.08)", "rgba(33,150,243,0.04)"],
    login:      ["rgba(123,47,255,0.10)", "rgba(0,255,255,0.08)", "rgba(255,51,153,0.06)"],
  }
  const colors = orbColors[route] ?? orbColors.altar

  return (
    <div
      ref={layerRef}
      className="aether-living"
      data-route={route}
      aria-hidden="true"
    >
      {isMounted && (
        <>
          {/* ── Nebula orbs (large background blobs) ── */}
          {Array.from({ length: orbCount }).map((_, i) => (
            <span
              key={`o${i}`}
              className="aether-orb"
              style={{
                top:        `${Math.random() * 80}%`,
                left:       `${Math.random() * 80}%`,
                width:      `${200 + Math.random() * 300}px`,
                height:     `${200 + Math.random() * 300}px`,
                background: `radial-gradient(circle, ${colors[i % colors.length]} 0%, transparent 70%)`,
              }}
            />
          ))}

          {/* ── Rising motes ── */}
          {Array.from({ length: moteCount }).map((_, i) => (
            <span
              key={`m${i}`}
              className="aether-mote"
              style={{
                ["--mote-size" as string]: `${1.5 + Math.random() * 4}px`,
                ["--mote-blur" as string]: `${Math.random() * 2}px`,
              }}
            />
          ))}

          {/* ── Ember sparks ── */}
          {Array.from({ length: emberCount }).map((_, i) => (
            <span key={`e${i}`} className="aether-ember" />
          ))}

          {/* ── Rising runes ── */}
          {Array.from({ length: runeCount }).map((_, i) => (
            <span
              key={`r${i}`}
              className="aether-rune-float"
              style={{
                fontSize: `${1.8 + Math.random() * 2.8}rem`,
              }}
            >
              {RUNES[i % RUNES.length]}
            </span>
          ))}
        </>
      )}
    </div>
  )
}
