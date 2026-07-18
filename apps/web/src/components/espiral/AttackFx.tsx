import { motion } from "framer-motion"
import type { Arquetipo } from "../../../../../packages/shared/src/types"

/**
 * VFX de impacto por arquetipo — cada golpe tiene identidad visual propia:
 * Guerrero taja, Guardián embiste con escudo, Oráculo dispara runas,
 * Devorador desgarra, Trickster acuchilla desde las sombras y el enemigo
 * ataca con zarpas del vacío.
 */

export interface AttackFxData {
  id: number
  archetype: Arquetipo | "enemy"
  /** Posición relativa (0-1) dentro del stage. */
  x: number
  y: number
  color: string
  crit: boolean
}

const FX_SIZE = 150

export function AttackFx({ fx }: { fx: AttackFxData }) {
  const scale = fx.crit ? 1.35 : 1
  return (
    <div
      style={{
        position: "absolute",
        left: `${fx.x * 100}%`,
        top: `${fx.y * 100}%`,
        width: FX_SIZE,
        height: FX_SIZE,
        transform: `translate(-50%, -50%) scale(${scale})`,
        pointerEvents: "none",
        zIndex: 40,
      }}
    >
      <FxShape archetype={fx.archetype} color={fx.color} crit={fx.crit} />
    </div>
  )
}

function FxShape({ archetype, color, crit }: { archetype: AttackFxData["archetype"]; color: string; crit: boolean }) {
  switch (archetype) {
    case "Guerrero":
      return <SlashFx color={color} crit={crit} double={false} />
    case "Guardián":
      return <BashFx color={color} />
    case "Oráculo":
      return <RuneBoltFx color={color} />
    case "Devorador":
      return <ClawFx color={color} teeth />
    case "Trickster":
      return <DaggerFx color={color} />
    case "enemy":
      return <ClawFx color={color} teeth={false} />
    default:
      return <SlashFx color={color} crit={crit} double={false} />
  }
}

/** Tajo diagonal — arco luminoso que barre el objetivo. */
function SlashFx({ color, crit, double }: { color: string; crit: boolean; double: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
      <motion.path
        d="M14 78 Q50 44 86 18"
        fill="none"
        stroke="#fff"
        strokeWidth={crit ? 7 : 5}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 1 }}
        animate={{ pathLength: 1, opacity: [1, 1, 0] }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 8px ${color})` }}
      />
      <motion.path
        d="M20 84 Q54 52 90 26"
        fill="none"
        stroke={color}
        strokeWidth={crit ? 4 : 2.6}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0.9 }}
        animate={{ pathLength: 1, opacity: [0.9, 0.9, 0] }}
        transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
      />
      {(crit || double) && (
        <motion.path
          d="M86 78 Q50 46 14 20"
          fill="none"
          stroke="#fff"
          strokeWidth="4.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 1 }}
          animate={{ pathLength: 1, opacity: [1, 1, 0] }}
          transition={{ duration: 0.26, delay: 0.12, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      )}
    </svg>
  )
}

/** Embiste de escudo — onda de choque circular con fragmentos. */
function BashFx({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
      <motion.circle
        cx="50"
        cy="50"
        r="20"
        fill="none"
        stroke={color}
        strokeWidth="5"
        initial={{ scale: 0.3, opacity: 1 }}
        animate={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.42, ease: "easeOut" }}
        style={{ transformOrigin: "center", filter: `drop-shadow(0 0 10px ${color})` }}
      />
      <motion.circle
        cx="50"
        cy="50"
        r="14"
        fill={`${color}44`}
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 1.4, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{ transformOrigin: "center" }}
      />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <motion.rect
            key={`frag-${a.toFixed(2)}`}
            x="47"
            y="47"
            width="6"
            height="6"
            fill="#fff"
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: Math.cos(a) * 38, y: Math.sin(a) * 38, opacity: 0, rotate: 120 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        )
      })}
    </svg>
  )
}

/** Proyectil rúnico — círculo mágico que colapsa sobre el objetivo. */
function RuneBoltFx({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
      <motion.circle
        cx="50"
        cy="50"
        r="30"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeDasharray="5 4"
        initial={{ scale: 1.6, opacity: 0, rotate: 0 }}
        animate={{ scale: 0.5, opacity: [0, 1, 0], rotate: 120 }}
        transition={{ duration: 0.45, ease: "easeIn" }}
        style={{ transformOrigin: "center" }}
      />
      <motion.path
        d="M50 34 L58 50 L50 66 L42 50 Z"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        initial={{ scale: 1.8, opacity: 0 }}
        animate={{ scale: 0.6, opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.42, ease: "easeIn" }}
        style={{ transformOrigin: "center", filter: `drop-shadow(0 0 9px ${color})` }}
      />
      <motion.circle
        cx="50"
        cy="50"
        r="7"
        fill="#fff"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.7, 0.4], opacity: [0, 1, 0] }}
        transition={{ duration: 0.35, delay: 0.22, ease: "easeOut" }}
        style={{ transformOrigin: "center", filter: `drop-shadow(0 0 14px ${color})` }}
      />
    </svg>
  )
}

/** Desgarro — tres zarpas paralelas (con mordida para el Devorador). */
function ClawFx({ color, teeth }: { color: string; teeth: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d={`M${24 + i * 16} 16 Q${30 + i * 16} 50 ${20 + i * 16} 86`}
          fill="none"
          stroke={i === 1 ? "#fff" : color}
          strokeWidth={i === 1 ? 5 : 3.6}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 1 }}
          animate={{ pathLength: 1, opacity: [1, 1, 0] }}
          transition={{ duration: 0.3, delay: i * 0.045, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 7px ${color})` }}
        />
      ))}
      {teeth && (
        <motion.g
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{ opacity: [0, 1, 0], scale: 0.85 }}
          transition={{ duration: 0.34, delay: 0.14 }}
          style={{ transformOrigin: "center" }}
        >
          <path d="M30 40 L38 48 L46 40 L54 48 L62 40 L70 48" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
          <path d="M30 62 L38 54 L46 62 L54 54 L62 62 L70 54" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
        </motion.g>
      )}
    </svg>
  )
}

/** Dagas cruzadas — dos cuchilladas rápidas desde ángulos opuestos. */
function DaggerFx({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
      <motion.line
        x1="10" y1="30" x2="90" y2="62"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 1 }}
        animate={{ pathLength: 1, opacity: [1, 1, 0] }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 7px ${color})` }}
      />
      <motion.line
        x1="90" y1="26" x2="10" y2="70"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 1 }}
        animate={{ pathLength: 1, opacity: [1, 1, 0] }}
        transition={{ duration: 0.2, delay: 0.1, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 7px ${color})` }}
      />
      {/* destello de aparición del trickster */}
      <motion.circle
        cx="78" cy="22" r="4"
        fill="#fff"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 0], scale: [0, 1.6, 0] }}
        transition={{ duration: 0.24 }}
        style={{ transformOrigin: "78px 22px" }}
      />
    </svg>
  )
}
