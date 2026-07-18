import { useEffect, useRef } from "react"

interface SparkCanvasProps {
  color: string
  /** "drift" = chispas flotando hacia arriba (reveal del Altar);
   *  "embers" = brasas lentas ambientales (La Espiral). */
  mode?: "drift" | "embers"
  /** Multiplicador de densidad de partículas (1 = default). */
  density?: number
}

export interface SparkBurstHandle {
  /** Explosión radial de partículas en coordenadas relativas (0-1). */
  burst: (xRatio: number, yRatio: number, color: string, count?: number) => void
}

type Spark = {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color?: string
  gravity?: number
}

/**
 * Motor de partículas canvas compartido — extraído de EntityReveal para que
 * el reveal del Altar, La Espiral y el drop de Ecos usen el mismo sistema.
 * Expone `burstRef` para disparar explosiones de impacto desde el combate.
 */
export function SparkCanvas({
  color,
  mode = "drift",
  density = 1,
  burstRef,
}: SparkCanvasProps & { burstRef?: React.MutableRefObject<SparkBurstHandle | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const sparks: Spark[] = []

    function spawnAmbient() {
      const x = Math.random() * canvas!.width
      const y = canvas!.height
      const slow = mode === "embers"
      sparks.push({
        x,
        y,
        r: Math.random() * 2.5 + 0.5,
        vx: (Math.random() - 0.5) * (slow ? 0.4 : 0.8),
        vy: -(Math.random() * (slow ? 1 : 2) + (slow ? 0.2 : 0.5)),
        life: 0,
        maxLife: 90 + Math.random() * 60,
      })
    }

    const initial = Math.round(30 * density)
    for (let i = 0; i < initial; i++) {
      spawnAmbient()
      sparks[sparks.length - 1]!.y = Math.random() * canvas.height
      sparks[sparks.length - 1]!.life = Math.random() * 80
    }

    if (burstRef) {
      burstRef.current = {
        burst(xRatio, yRatio, burstColor, count = 24) {
          const cx = xRatio * canvas!.width
          const cy = yRatio * canvas!.height
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const speed = 1.5 + Math.random() * 4
            sparks.push({
              x: cx,
              y: cy,
              r: Math.random() * 3 + 1,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 1,
              life: 0,
              maxLife: 30 + Math.random() * 30,
              color: burstColor,
              gravity: 0.08,
            })
          }
        },
      }
    }

    let raf: number
    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      if (Math.random() < 0.35 * density) spawnAmbient()

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]!
        s.x += s.vx
        s.y += s.vy
        if (s.gravity) s.vy += s.gravity
        s.life++
        const progress = s.life / s.maxLife
        const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8
        const c = s.color ?? color
        ctx!.save()
        ctx!.globalAlpha = Math.max(0, alpha) * 0.85
        ctx!.shadowBlur = 8
        ctx!.shadowColor = c
        ctx!.fillStyle = c
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.restore()
        if (s.life >= s.maxLife) sparks.splice(i, 1)
      }
      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      if (burstRef) burstRef.current = null
    }
  }, [color, mode, density, burstRef])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  )
}
