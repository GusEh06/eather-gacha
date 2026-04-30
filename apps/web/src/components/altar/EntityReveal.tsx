import { motion } from "framer-motion"
import { useEffect, useRef } from "react"
import type { Rareza } from "../../../../../packages/shared/src/types"
import { RARITY_CONFIG, NON_BAZAAR_RARITIES } from "../../config/rarityConfig"
import type { InvokeResult } from "../../hooks/useInvoke"

interface EntityRevealProps {
  result: InvokeResult
  onContinue: () => void
  onListBazaar?: () => void
}

/* Spark canvas — draws animated glowing particles that drift upward */
function SparkCanvas({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    type Spark = { x: number; y: number; r: number; vx: number; vy: number; life: number; maxLife: number }
    const sparks: Spark[] = []

    function spawn() {
      const x = Math.random() * canvas!.width
      const y = canvas!.height
      sparks.push({ x, y, r: Math.random() * 2.5 + 0.5, vx: (Math.random() - 0.5) * 0.8, vy: -(Math.random() * 2 + 0.5), life: 0, maxLife: 90 + Math.random() * 60 })
    }

    for (let i = 0; i < 30; i++) {
      spawn()
      sparks[sparks.length - 1]!.y = Math.random() * canvas.height
      sparks[sparks.length - 1]!.life = Math.random() * 80
    }

    let raf: number
    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      if (Math.random() < 0.35) spawn()

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]!
        s.x += s.vx
        s.y += s.vy
        s.life++
        const progress = s.life / s.maxLife
        const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8
        ctx!.save()
        ctx!.globalAlpha = Math.max(0, alpha) * 0.85
        ctx!.shadowBlur = 8
        ctx!.shadowColor = color
        ctx!.fillStyle = color
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.restore()
        if (s.life >= s.maxLife) sparks.splice(i, 1)
      }
      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [color])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  )
}

export function EntityReveal({ result, onContinue, onListBazaar }: EntityRevealProps) {
  const { entity } = result
  const rareza = entity.rareza as Rareza
  const cfg = RARITY_CONFIG[rareza]
  const canListBazaar = !NON_BAZAAR_RARITIES.includes(rareza)
  const isSingularity = rareza === "singularity"
  const rarityColor = cfg.color

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        /* Transparent — let the gacha-shell atmosphere show through seamlessly */
        background: "transparent",
        overflow: "hidden",
      }}
    >
      {/* Full-screen spark field */}
      <SparkCanvas color={rarityColor} />

      {/* Radial glow behind entity — larger and more saturated */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 60% 60% at 50% 45%, ${rarityColor}30 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* ── Floating entity — NO card border, just the character floating in space ── */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 80 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 1,
          maxWidth: "min(90vw, 480px)",
        }}
      >
        {/* Entity image — floating with glow, no box/card */}
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "relative",
            width: "240px",
            height: "240px",
            marginBottom: "1.5rem",
          }}
        >
          {/* Glow ring behind entity */}
          <div
            style={{
              position: "absolute",
              inset: "-20%",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${rarityColor}25 0%, ${rarityColor}08 50%, transparent 70%)`,
              animation: "reveal-glow-pulse 3s ease-in-out infinite",
            }}
          />
          <img
            src={entity.imageUrl}
            alt={entity.nombre}
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter: `drop-shadow(0 0 32px ${rarityColor}88) drop-shadow(0 4px 12px #00000099)`,
            }}
          />
        </motion.div>

        {/* Rarity badge — pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 300 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: `${rarityColor}18`,
            border: `1px solid ${rarityColor}55`,
            borderRadius: "999px",
            padding: "0.25rem 1rem",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: "0.75rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: rarityColor,
            backdropFilter: "blur(8px)",
            marginBottom: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.9em" }}>{cfg.icon}</span>
          {cfg.label}
        </motion.div>

        {/* Name */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.2rem, 6vw, 3.2rem)",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "0.1em",
            margin: "0 0 0.25rem",
            textShadow: `0 0 40px ${rarityColor}bb, 0 0 80px ${rarityColor}44`,
          }}
        >
          {entity.nombre}
        </motion.h2>

        {/* Arquetipo · Época */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          transition={{ delay: 0.45 }}
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-ui)",
            fontSize: "0.85rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: "0 0 1rem",
          }}
        >
          {entity.arquetipo} · {entity.epoca}
        </motion.p>

        {/* Divider — thin glowing line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          style={{
            width: "60%",
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${rarityColor}88, transparent)`,
            marginBottom: "1rem",
          }}
        />

        {/* Lore */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.55 }}
          style={{
            color: "#e0d8f0",
            fontFamily: "var(--font-ui)",
            fontSize: "0.85rem",
            fontStyle: "italic",
            lineHeight: 1.7,
            textAlign: "center",
            margin: "0 0 2rem",
            maxWidth: "360px",
          }}
        >
          &ldquo;{entity.descripcionLore}&rdquo;
        </motion.p>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}
        >
          {canListBazaar && (
            <button
              onClick={onListBazaar}
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: "0.82rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "0.65rem 1.4rem",
                background: "rgba(255,255,255,0.06)",
                color: rarityColor,
                border: `1px solid ${rarityColor}55`,
                borderRadius: "6px",
                cursor: "pointer",
                backdropFilter: "blur(6px)",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = `${rarityColor}22`; (e.target as HTMLElement).style.borderColor = `${rarityColor}` }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.target as HTMLElement).style.borderColor = `${rarityColor}55` }}
            >
              Listar en el Bazar
            </button>
          )}
          <button
            onClick={onContinue}
            style={{
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: "0.82rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "0.65rem 1.75rem",
              background: `linear-gradient(135deg, ${rarityColor}, ${rarityColor}cc)`,
              color: "#000",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              boxShadow: `0 0 24px ${rarityColor}66, 0 4px 12px #00000066`,
              transition: "all 0.18s ease",
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.transform = "scale(1.05)"; (e.target as HTMLElement).style.boxShadow = `0 0 32px ${rarityColor}88, 0 6px 16px #00000066` }}
            onMouseLeave={e => { (e.target as HTMLElement).style.transform = "scale(1)"; (e.target as HTMLElement).style.boxShadow = `0 0 24px ${rarityColor}66, 0 4px 12px #00000066` }}
          >
            Continuar
          </button>
        </motion.div>
      </motion.div>

      {/* CSS keyframes injected inline */}
      <style>{`
        @keyframes reveal-glow-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>
    </motion.div>
  )
}
