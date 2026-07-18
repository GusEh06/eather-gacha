import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { Rareza } from "../../../../../packages/shared/src/types"
import type {
  CombatLogEntry,
  CombatantSnapshot,
  EspiralPlayerAction,
} from "../../../../../packages/shared/src/espiral"
import { RARITY_CONFIG } from "../../config/rarityConfig"
import { EnemyCreature, creatureAccent } from "./EnemyCreature"
import { AttackFx, type AttackFxData } from "./AttackFx"
import { SparkCanvas, type SparkBurstHandle } from "../shared/SparkCanvas"
import { DamageNumber, type FloatingNumber } from "./DamageNumber"
import { AbilityFlashOverlay, type AbilityFlash } from "./AbilityFlashOverlay"
import { BossIntroSequence } from "./BossIntroSequence"

interface CombatStageProps {
  combatants: CombatantSnapshot[]
  /** En modo auto: el log completo. En manual: crece con cada acción. */
  log: CombatLogEntry[]
  floor: number
  boss: boolean
  /** Resultado final si ya se conoce; null mientras el combate manual sigue abierto. */
  victory: boolean | null
  /** Manual: id del miembro que debe elegir acción (muestra la barra de acciones). */
  awaiting?: string | null
  onAction?: (action: EspiralPlayerAction) => void
  actionPending?: boolean
  /** HP inicial al reanudar un combate manual tras un refresh. */
  initialHp?: Record<string, number>
  onFinished: (victory: boolean) => void
}

const ENEMY_COLOR = "#c74b4b"

function colorFor(c: CombatantSnapshot): string {
  if (c.rareza === "enemy") return creatureAccent(c.nombre)
  return RARITY_CONFIG[c.rareza as Rareza]?.color ?? "#8a8a8a"
}

/** Partículas de impacto según la rareza del atacante — el espectáculo escala. */
const RARITY_BURST: Record<string, number> = {
  dust: 14,
  nebula: 18,
  comet: 24,
  nova: 30,
  pulsar: 38,
  eclipse: 46,
  singularity: 56,
  enemy: 20,
}

function isBrokenAbility(ability: string): boolean {
  return ability === "extra_turn" || ability === "ignore_def" || ability === "one_time_revive"
}

/** Duración de playback por tipo de evento (ms). */
function entryDuration(entry: CombatLogEntry): number {
  switch (entry.kind) {
    case "combat_start":
      return entry.boss ? 2400 : 1100
    case "team_buff":
      return 950
    case "defend":
    case "focus":
      return 650
    case "attack":
      return 720
    case "ability_proc":
      return isBrokenAbility(entry.ability) ? 1500 : 650
    case "burn_tick":
      return 480
    case "stunned":
      return 500
    case "death":
      return 800
    case "revive":
      return 1100
    case "victory":
    case "defeat":
      return 900
  }
}

/** Posición relativa aproximada de cada combatiente para los bursts de chispas. */
function burstPos(id: string, teamIds: string[]): { x: number; y: number } {
  if (id === "enemy") return { x: 0.74, y: 0.45 }
  const idx = Math.max(0, teamIds.indexOf(id))
  return { x: 0.24, y: 0.22 + idx * 0.26 }
}

export function CombatStage({
  combatants,
  log,
  floor,
  boss,
  victory,
  awaiting,
  onAction,
  actionPending,
  initialHp,
  onFinished,
}: CombatStageProps) {
  const team = useMemo(() => combatants.filter((c) => c.id !== "enemy"), [combatants])
  const enemy = useMemo(() => combatants.find((c) => c.id === "enemy")!, [combatants])
  const teamIds = useMemo(() => team.map((t) => t.id), [team])

  const [step, setStep] = useState(0)
  const [hpMap, setHpMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(combatants.map((c) => [c.id, initialHp?.[c.id] ?? c.maxHp]))
  )
  const [floats, setFloats] = useState<Record<string, FloatingNumber[]>>({})
  const [flash, setFlash] = useState<AbilityFlash | null>(null)
  const [shake, setShake] = useState<{ key: number; mag: number }>({ key: 0, mag: 0 })
  const [dead, setDead] = useState<Set<string>>(
    () => new Set(combatants.filter((c) => (initialHp?.[c.id] ?? c.maxHp) <= 0).map((c) => c.id))
  )
  const [stances, setStances] = useState<Record<string, "defend" | "focus" | undefined>>({})
  const [attackingId, setAttackingId] = useState<string | null>(null)
  const [hitId, setHitId] = useState<string | null>(null)
  const [stunned, setStunned] = useState<Set<string>>(new Set())
  const [buffGlow, setBuffGlow] = useState(false)
  const [showBossIntro, setShowBossIntro] = useState(false)
  const [outcome, setOutcome] = useState<"victory" | "defeat" | null>(null)
  const [skipped, setSkipped] = useState(false)
  const [attackFx, setAttackFx] = useState<AttackFxData[]>([])
  const [impactFlash, setImpactFlash] = useState<{ key: number; crit: boolean } | null>(null)
  const [shockwave, setShockwave] = useState<{ key: number; x: number; y: number; color: string } | null>(null)

  const burstRef = useRef<SparkBurstHandle | null>(null)
  const floatIdRef = useRef(0)
  const fxIdRef = useRef(0)

  function pushFloat(targetId: string, value: number, crit: boolean, kind: FloatingNumber["kind"]) {
    const id = ++floatIdRef.current
    const offsetX = (Math.random() - 0.5) * 30
    setFloats((prev) => ({
      ...prev,
      [targetId]: [...(prev[targetId] ?? []), { id, value, crit, kind, offsetX }],
    }))
    setTimeout(() => {
      setFloats((prev) => ({
        ...prev,
        [targetId]: (prev[targetId] ?? []).filter((f) => f.id !== id),
      }))
    }, 1100)
  }

  // ── Procesar cada entrada del log con su timing ──
  useEffect(() => {
    if (step >= log.length) return
    const entry = log[step]!
    let duration = skipped ? 0 : entryDuration(entry)

    // Efectos del entry actual
    switch (entry.kind) {
      case "combat_start":
        if (entry.boss && !skipped) {
          setShowBossIntro(true)
          setTimeout(() => setShowBossIntro(false), 2200)
        }
        break
      case "team_buff": {
        const source = combatants.find((c) => c.id === entry.sourceId)
        if (source) {
          setFlash({
            id: step,
            ability: entry.ability,
            sourceName: source.nombre,
            color: colorFor(source),
            broken: false,
          })
          setBuffGlow(true)
          setTimeout(() => setFlash(null), 900)
        }
        break
      }
      case "defend": {
        setStances((prev) => ({ ...prev, [entry.actorId]: "defend" }))
        break
      }
      case "focus": {
        setStances((prev) => ({ ...prev, [entry.actorId]: "focus" }))
        break
      }
      case "attack": {
        setAttackingId(entry.attackerId)
        setHitId(entry.targetId)
        // Atacar consume la postura del atacante (canalizar) — defender expira
        // cuando vuelve a tocarle el turno, que en el log es su próxima acción.
        setStances((prev) => (prev[entry.attackerId] ? { ...prev, [entry.attackerId]: undefined } : prev))
        setHpMap((prev) => ({ ...prev, [entry.targetId]: entry.targetHpAfter }))
        pushFloat(entry.targetId, entry.damage, entry.crit, "damage")
        // Shake proporcional al % de vida arrancado
        const target = combatants.find((c) => c.id === entry.targetId)
        const pct = target ? entry.damage / target.maxHp : 0.1
        const mag = Math.min(14, 3 + pct * 40) * (entry.crit ? 1.4 : 1)
        setShake((s) => ({ key: s.key + 1, mag }))

        const pos = burstPos(entry.targetId, teamIds)
        const attacker = combatants.find((c) => c.id === entry.attackerId)
        const atkColor = attacker ? colorFor(attacker) : "#fff"

        // Burst de partículas — la cantidad escala con la rareza del atacante
        const baseBurst = RARITY_BURST[attacker?.rareza ?? "dust"] ?? 20
        burstRef.current?.burst(pos.x, pos.y, atkColor, Math.round(baseBurst * (entry.crit ? 1.5 : 1)))

        // VFX de golpe con identidad por arquetipo
        const fxId = ++fxIdRef.current
        setAttackFx((prev) => [
          ...prev,
          {
            id: fxId,
            archetype: attacker?.rareza === "enemy" ? "enemy" : (attacker?.arquetipo ?? "Guerrero"),
            x: pos.x,
            y: pos.y,
            color: atkColor,
            crit: entry.crit,
          },
        ])
        setTimeout(() => setAttackFx((prev) => prev.filter((f) => f.id !== fxId)), 550)

        const kill = entry.targetHpAfter <= 0
        // Hit-stop: crits y golpes letales congelan el aire un instante
        if (!skipped && (entry.crit || kill)) {
          setImpactFlash({ key: fxId, crit: entry.crit })
          setTimeout(() => setImpactFlash(null), 190)
          duration += 170
        }
        // Golpe final al enemigo: onda expansiva + respiro dramático
        if (!skipped && kill && entry.targetId === "enemy") {
          setShockwave({ key: fxId, x: pos.x, y: pos.y, color: atkColor })
          setTimeout(() => setShockwave(null), 800)
          duration += 420
        }

        setTimeout(() => {
          setAttackingId(null)
          setHitId(null)
        }, 400)
        break
      }
      case "ability_proc": {
        const source = combatants.find((c) => c.id === entry.sourceId)
        if (source) {
          setFlash({
            id: step,
            ability: entry.ability,
            sourceName: source.nombre,
            color: colorFor(source),
            broken: isBrokenAbility(entry.ability),
          })
          setTimeout(() => setFlash(null), isBrokenAbility(entry.ability) ? 1400 : 600)
        }
        break
      }
      case "burn_tick":
        setHpMap((prev) => ({ ...prev, [entry.targetId]: entry.targetHpAfter }))
        pushFloat(entry.targetId, entry.damage, false, "burn")
        break
      case "stunned":
        setStunned((prev) => new Set(prev).add(entry.targetId))
        setTimeout(() => {
          setStunned((prev) => {
            const next = new Set(prev)
            next.delete(entry.targetId)
            return next
          })
        }, 900)
        break
      case "death":
        setDead((prev) => new Set(prev).add(entry.targetId))
        setShake((s) => ({ key: s.key + 1, mag: 10 }))
        break
      case "revive": {
        setDead((prev) => {
          const next = new Set(prev)
          next.delete(entry.targetId)
          return next
        })
        setHpMap((prev) => ({ ...prev, [entry.targetId]: entry.hpAfter }))
        pushFloat(entry.targetId, entry.hpAfter, false, "heal")
        const pos = burstPos(entry.targetId, teamIds)
        burstRef.current?.burst(pos.x, pos.y, "#ffd76b", 40)
        break
      }
      case "victory":
        setOutcome("victory")
        break
      case "defeat":
        setOutcome("defeat")
        break
    }

    const t = setTimeout(() => setStep((s) => s + 1), duration)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, skipped, log.length])

  // ── Fin del playback (solo cuando el log ya contiene victory/defeat) ──
  useEffect(() => {
    if (step >= log.length && log.length > 0 && victory !== null) {
      const t = setTimeout(() => onFinished(victory), skipped ? 100 : 600)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, log.length, victory])

  // Barra de acciones visible: manual, playback al día y combate sin resolver
  const showActionBar = Boolean(awaiting && onAction && victory === null && step >= log.length)
  const awaitingMember = showActionBar ? team.find((t) => t.id === awaiting) : undefined

  function skipAll() {
    if (victory === null) return // manual en curso: no hay final que saltar
    setSkipped(true)
    // Aplicar estado final instantáneamente
    const finalHp: Record<string, number> = Object.fromEntries(
      combatants.map((c) => [c.id, initialHp?.[c.id] ?? c.maxHp])
    )
    const finalDead = new Set<string>()
    for (const entry of log) {
      if (entry.kind === "attack" || entry.kind === "burn_tick") {
        finalHp[entry.targetId] = entry.targetHpAfter
      }
      if (entry.kind === "death") finalDead.add(entry.targetId)
      if (entry.kind === "revive") {
        finalDead.delete(entry.targetId)
        finalHp[entry.targetId] = entry.hpAfter
      }
    }
    setHpMap(finalHp)
    setDead(finalDead)
    setOutcome(victory ? "victory" : "defeat")
    setShowBossIntro(false)
    setFlash(null)
    setStep(log.length)
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: "62vh",
        overflow: "hidden",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Shake wrapper — magnitud vía CSS var, re-trigger vía key */}
      <div
        key={shake.key}
        style={
          {
            position: "absolute",
            inset: 0,
            animation: shake.mag > 0 ? "espiral-shake 0.35s ease-out" : undefined,
            "--shake-mag": `${shake.mag}px`,
          } as React.CSSProperties
        }
      >
        <SparkCanvas
          color={boss ? ENEMY_COLOR : "#5a4bd4"}
          mode="embers"
          density={boss ? 1.4 : 0.8}
          burstRef={burstRef}
        />

        {/* Layout: equipo a la izquierda, enemigo a la derecha */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "2.5rem 6%",
            minHeight: "62vh",
            zIndex: 1,
          }}
        >
          {/* Equipo */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
            {team.map((member) => (
              <TeamPortrait
                key={member.id}
                combatant={member}
                hp={hpMap[member.id] ?? member.maxHp}
                isDead={dead.has(member.id)}
                isAttacking={attackingId === member.id}
                isHit={hitId === member.id}
                isStunned={stunned.has(member.id)}
                buffGlow={buffGlow}
                floats={floats[member.id] ?? []}
                stance={stances[member.id]}
                isAwaiting={showActionBar && awaiting === member.id}
              />
            ))}
          </div>

          {/* Enemigo */}
          <EnemyOrb
            combatant={enemy}
            hp={hpMap.enemy ?? enemy.maxHp}
            isDead={dead.has("enemy")}
            isAttacking={attackingId === "enemy"}
            isHit={hitId === "enemy"}
            isStunned={stunned.has("enemy")}
            boss={boss}
            floats={floats.enemy ?? []}
          />
        </div>

        {/* VFX de golpes por arquetipo */}
        {attackFx.map((fx) => (
          <AttackFx key={fx.id} fx={fx} />
        ))}

        {/* Onda expansiva del golpe final */}
        <AnimatePresence>
          {shockwave && (
            <motion.div
              key={shockwave.key}
              initial={{ scale: 0.1, opacity: 0.95 }}
              animate={{ scale: 3.4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: `${shockwave.x * 100}%`,
                top: `${shockwave.y * 100}%`,
                width: 160,
                height: 160,
                marginLeft: -80,
                marginTop: -80,
                borderRadius: "50%",
                border: `3px solid ${shockwave.color}`,
                boxShadow: `0 0 40px ${shockwave.color}aa, inset 0 0 30px ${shockwave.color}55`,
                pointerEvents: "none",
                zIndex: 42,
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Hit-stop: flash de impacto + vignette de crítico */}
      <AnimatePresence>
        {impactFlash && (
          <motion.div
            key={impactFlash.key}
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 44,
              pointerEvents: "none",
              background: impactFlash.crit
                ? "radial-gradient(circle at center, #ffffff66 0%, transparent 55%)"
                : "radial-gradient(circle at center, #ffffff44 0%, transparent 45%)",
              boxShadow: impactFlash.crit ? "inset 0 0 90px #ffd76b88" : undefined,
            }}
          />
        )}
      </AnimatePresence>

      {/* Overlays */}
      <AbilityFlashOverlay flash={flash} />
      <AnimatePresence>
        {showBossIntro && <BossIntroSequence bossName={enemy.nombre} floor={floor} />}
      </AnimatePresence>

      {/* Barra de acciones — combate manual */}
      <AnimatePresence>
        {showActionBar && awaitingMember && (
          <ActionBar
            member={awaitingMember}
            disabled={Boolean(actionPending)}
            onAction={onAction!}
          />
        )}
      </AnimatePresence>

      {/* Resultado */}
      <AnimatePresence>
        {outcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 45,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: outcome === "victory" ? "rgba(0,20,10,0.45)" : "rgba(20,0,5,0.6)",
              backdropFilter: "blur(2px)",
              pointerEvents: "none",
            }}
          >
            <motion.h2
              initial={{ scale: 2.6, opacity: 0, filter: "blur(14px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ type: "spring", stiffness: 180, damping: 16 }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.4rem, 8vw, 5rem)",
                fontWeight: 900,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: outcome === "victory" ? "#3ddc97" : "#e0245e",
                textShadow:
                  outcome === "victory"
                    ? "0 0 50px #3ddc97aa, 0 0 120px #3ddc9755"
                    : "0 0 50px #e0245eaa, 0 0 120px #e0245e55",
                margin: 0,
              }}
            >
              {outcome === "victory" ? "Victoria" : "Has caído"}
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Piso + skip */}
      <div
        style={{
          position: "absolute",
          top: "1rem",
          left: "1.4rem",
          right: "1.4rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 46,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.8rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: boss ? ENEMY_COLOR : "var(--text-secondary)",
          }}
        >
          {boss ? `⚠ Piso ${floor} — Jefe` : `Piso ${floor}`}
        </span>
        {victory !== null && step < log.length && (
          <button
            onClick={skipAll}
            style={{
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: "0.72rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: "rgba(255,255,255,0.06)",
              color: "var(--text-secondary)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "6px",
              padding: "0.35rem 0.9rem",
              cursor: "pointer",
            }}
          >
            Saltar ≫
          </button>
        )}
      </div>

      <style>{`
        @keyframes espiral-shake {
          0%   { transform: translate(0, 0); }
          15%  { transform: translate(calc(var(--shake-mag) * -1), calc(var(--shake-mag) * 0.6)); }
          30%  { transform: translate(var(--shake-mag), calc(var(--shake-mag) * -0.5)); }
          45%  { transform: translate(calc(var(--shake-mag) * -0.7), calc(var(--shake-mag) * -0.4)); }
          60%  { transform: translate(calc(var(--shake-mag) * 0.5), calc(var(--shake-mag) * 0.4)); }
          75%  { transform: translate(calc(var(--shake-mag) * -0.3), calc(var(--shake-mag) * 0.2)); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
    </div>
  )
}

// ─── Retrato de miembro del equipo ───────────────────────────────────────────

function HpBar({ hp, maxHp, color }: { hp: number; maxHp: number; color: string }) {
  const pct = Math.max(0, (hp / maxHp) * 100)
  const barColor = pct > 50 ? color : pct > 25 ? "#f0a500" : "#e0245e"
  return (
    <div
      style={{
        width: "100%",
        height: "7px",
        background: "rgba(0,0,0,0.6)",
        borderRadius: "4px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <motion.div
        animate={{ width: `${pct}%`, background: barColor }}
        transition={{ type: "spring", stiffness: 160, damping: 22 }}
        style={{ height: "100%", boxShadow: `0 0 8px ${barColor}` }}
      />
    </div>
  )
}

interface TeamPortraitProps {
  combatant: CombatantSnapshot
  hp: number
  isDead: boolean
  isAttacking: boolean
  isHit: boolean
  isStunned: boolean
  buffGlow: boolean
  floats: FloatingNumber[]
  stance?: "defend" | "focus"
  isAwaiting?: boolean
}

function TeamPortrait({
  combatant,
  hp,
  isDead,
  isAttacking,
  isHit,
  isStunned,
  buffGlow,
  floats,
  stance,
  isAwaiting,
}: TeamPortraitProps) {
  const color = colorFor(combatant)
  const stanceColor = stance === "defend" ? "#4aa3ff" : "#ffd76b"
  return (
    <motion.div
      animate={{
        x: isAttacking ? 34 : isAwaiting ? 10 : 0,
        opacity: isDead ? 0.35 : 1,
        filter: isDead ? "grayscale(1) brightness(0.5)" : "grayscale(0) brightness(1)",
        rotate: isDead ? -6 : 0,
      }}
      transition={{ type: "spring", stiffness: 380, damping: 20 }}
      style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.9rem", width: "230px" }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        {/* Indicador de turno activo (combate manual) */}
        {isAwaiting && (
          <motion.div
            animate={{ scale: [1, 1.14, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: "-7px",
              borderRadius: "50%",
              border: "2px solid #fff",
              boxShadow: "0 0 18px #ffffff88",
              pointerEvents: "none",
            }}
          />
        )}
        {/* Anillo de rareza */}
        <motion.div
          animate={{
            boxShadow: buffGlow
              ? [`0 0 12px ${color}66`, `0 0 26px ${color}cc`, `0 0 12px ${color}66`]
              : stance
                ? `0 0 20px ${stanceColor}aa`
                : `0 0 12px ${color}66`,
          }}
          transition={buffGlow ? { duration: 1.6, repeat: Infinity } : undefined}
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            border: `2px solid ${stance ? stanceColor : color}`,
            overflow: "hidden",
            background: "#0a0a12",
          }}
        >
          <motion.img
            src={combatant.imageUrl}
            alt={combatant.nombre}
            animate={{
              filter: isHit ? "brightness(2.4) saturate(0.4)" : "brightness(1) saturate(1)",
              scale: isHit ? 0.92 : 1,
            }}
            transition={{ duration: 0.25 }}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </motion.div>
        {isStunned && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 12, -12, 0] }}
            transition={{ rotate: { duration: 0.8, repeat: Infinity } }}
            style={{ position: "absolute", top: "-10px", right: "-6px", fontSize: "1.1rem" }}
          >
            💫
          </motion.span>
        )}
        {stance && (
          <motion.span
            initial={{ scale: 0, y: 6 }}
            animate={{ scale: 1, y: 0 }}
            style={{
              position: "absolute",
              bottom: "-6px",
              right: "-8px",
              fontSize: "1.05rem",
              filter: `drop-shadow(0 0 6px ${stanceColor})`,
            }}
          >
            {stance === "defend" ? "🛡" : "✦"}
          </motion.span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: "0.82rem",
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: "0.3rem",
          }}
        >
          {combatant.nombre}
        </div>
        <HpBar hp={hp} maxHp={combatant.maxHp} color={color} />
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.68rem",
            color: "var(--text-secondary)",
            marginTop: "0.25rem",
          }}
        >
          {Math.max(0, hp).toLocaleString()} / {combatant.maxHp.toLocaleString()}
        </div>
      </div>
      <AnimatePresence>
        {floats.map((f) => (
          <DamageNumber key={f.id} num={f} />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Enemigo: orbe del vacío (cero arte requerido) ──────────────────────────

interface EnemyOrbProps {
  combatant: CombatantSnapshot
  hp: number
  isDead: boolean
  isAttacking: boolean
  isHit: boolean
  isStunned: boolean
  boss: boolean
  floats: FloatingNumber[]
}

function EnemyOrb({ combatant, hp, isDead, isAttacking, isHit, isStunned, boss, floats }: EnemyOrbProps) {
  const size = boss ? 210 : 150
  const accent = creatureAccent(combatant.nombre)
  return (
    <motion.div
      animate={{
        x: isAttacking ? -34 : 0,
        opacity: isDead ? 0 : 1,
        scale: isDead ? 0.2 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.9rem",
        width: `${size + 50}px`,
      }}
    >
      <div style={{ position: "relative" }}>
        {/* Aura amenazante con el acento de la criatura */}
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0.8, 0.45] }}
          transition={{ duration: boss ? 1.6 : 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: "-14%",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}33 0%, transparent 68%)`,
          }}
        />
        {/* Criatura del bestiario (o arte del admin si existe) */}
        <motion.div
          animate={{
            filter: isHit ? "brightness(2.6) saturate(0.5)" : "brightness(1) saturate(1)",
            scale: isHit ? 0.94 : 1,
            rotate: isStunned ? [0, 4, -4, 0] : 0,
          }}
          transition={{ duration: 0.25 }}
        >
          <EnemyCreature
            nombre={combatant.nombre}
            size={size}
            attacking={isAttacking}
            imageUrl={combatant.imageUrl}
          />
        </motion.div>
        {isStunned && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1.3, rotate: [0, 14, -14, 0] }}
            transition={{ rotate: { duration: 0.7, repeat: Infinity } }}
            style={{ position: "absolute", top: "-14px", right: "6px", fontSize: "1.5rem" }}
          >
            💫
          </motion.span>
        )}
      </div>
      <div style={{ width: "100%", textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: boss ? "1.05rem" : "0.9rem",
            letterSpacing: "0.08em",
            color: boss ? accent : "#e8d8dc",
            textShadow: boss ? `0 0 16px ${accent}88` : undefined,
            marginBottom: "0.4rem",
          }}
        >
          {combatant.nombre}
        </div>
        <HpBar hp={hp} maxHp={combatant.maxHp} color={accent} />
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.7rem",
            color: "var(--text-secondary)",
            marginTop: "0.25rem",
          }}
        >
          {Math.max(0, hp).toLocaleString()} / {combatant.maxHp.toLocaleString()}
        </div>
      </div>
      <AnimatePresence>
        {floats.map((f) => (
          <DamageNumber key={f.id} num={f} />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Barra de acciones (combate manual) ──────────────────────────────────────

const ACTION_DEFS: Array<{ id: EspiralPlayerAction; label: string; icon: string; hint: string; color: string }> = [
  { id: "attack", label: "Atacar", icon: "⚔", hint: "Golpe directo al enemigo", color: "#e0245e" },
  { id: "defend", label: "Defender", icon: "🛡", hint: "Reduce el daño recibido hasta tu próximo turno", color: "#4aa3ff" },
  { id: "focus", label: "Canalizar", icon: "✦", hint: "Tu próximo ataque pega más fuerte y critea más", color: "#ffd76b" },
]

function ActionBar({
  member,
  disabled,
  onAction,
}: {
  member: CombatantSnapshot
  disabled: boolean
  onAction: (action: EspiralPlayerAction) => void
}) {
  const color = colorFor(member)
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "1.1rem",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 48,
      }}
    >
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 26 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      data-testid="combat-action-bar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.7rem",
        background: "rgba(8,6,18,0.88)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: "14px",
        padding: "0.7rem 1rem",
        backdropFilter: "blur(8px)",
        pointerEvents: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", paddingRight: "0.5rem", borderRight: "1px solid rgba(255,255,255,0.12)" }}>
        {member.imageUrl && (
          <img
            src={member.imageUrl}
            alt={member.nombre}
            style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: `2px solid ${color}` }}
          />
        )}
        <span style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "0.78rem", color: "#fff", whiteSpace: "nowrap" }}>
          Turno de {member.nombre}
        </span>
      </div>
      {ACTION_DEFS.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onAction(a.id)}
          disabled={disabled}
          title={a.hint}
          data-testid={`action-${a.id}`}
          style={{
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: "0.78rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#fff",
            background: `${a.color}22`,
            border: `1px solid ${a.color}88`,
            borderRadius: "9px",
            padding: "0.55rem 1rem",
            cursor: disabled ? "wait" : "pointer",
            opacity: disabled ? 0.55 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            boxShadow: `0 0 12px ${a.color}33`,
          }}
        >
          <span style={{ filter: `drop-shadow(0 0 5px ${a.color})` }}>{a.icon}</span>
          {a.label}
        </button>
      ))}
    </motion.div>
    </div>
  )
}
