import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { Rareza } from "../../../../packages/shared/src/types"
import {
  ESPIRAL_ABILITIES,
  ESPIRAL_REVIVE_COST_ECOS,
  getEffectiveStats,
  getEspiralAbility,
  isBossFloor,
  type CombatLogEntry,
  type CombatantSnapshot,
  type EspiralPlayerAction,
} from "../../../../packages/shared/src/espiral"
import { RARITY_CONFIG } from "../config/rarityConfig"
import { ECOS_CONFIG } from "../config/ecosConfig"
import { useInventory, type InventoryItem } from "../hooks/useInventory"
import {
  useAdvanceFloor,
  useAdvanceManual,
  useClaimMission,
  useCombatAction,
  useEspiralMissions,
  useEspiralState,
  useRetreat,
  useReviveRun,
  useStartRun,
  type AdvanceResponse,
} from "../hooks/useEspiral"
import { ParallaxBackground } from "../components/espiral/ParallaxBackground"
import { CombatStage } from "../components/espiral/CombatStage"
import { FloorOdometer } from "../components/espiral/FloorOdometer"
import { EnergyIndicator } from "../components/espiral/EnergyIndicator"
import { EcosDropReveal } from "../components/espiral/EcosDropReveal"

export const Route = createFileRoute("/espiral")({ component: EspiralPage })

type Phase = "hub" | "team" | "combat" | "aftermath"

export type CombatMode = "auto" | "manual"

const COMBAT_MODE_KEY = "espiral-combat-mode"

interface ManualCombatState {
  floor: number
  boss: boolean
  combatants: CombatantSnapshot[]
  log: CombatLogEntry[]
  awaiting: string | null
  initialHp?: Record<string, number>
}

function EspiralPage() {
  const { data: state } = useEspiralState()
  const { data: inventory } = useInventory()
  const startMutation = useStartRun()
  const advanceMutation = useAdvanceFloor()
  const advanceManualMutation = useAdvanceManual()
  const actionMutation = useCombatAction()
  const retreatMutation = useRetreat()
  const reviveMutation = useReviveRun()

  const [phase, setPhase] = useState<Phase>("hub")
  const [selected, setSelected] = useState<string[]>([])
  const [combat, setCombat] = useState<AdvanceResponse | null>(null)
  const [manual, setManual] = useState<ManualCombatState | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // El modo persiste en localStorage, pero se lee tras el montaje para que el
  // HTML del SSR (siempre "auto") coincida con la primera pasada de hidratación.
  const [combatMode, setCombatMode] = useState<CombatMode>("auto")
  useEffect(() => {
    if (window.localStorage.getItem(COMBAT_MODE_KEY) === "manual") setCombatMode("manual")
  }, [])

  function changeMode(mode: CombatMode) {
    setCombatMode(mode)
    window.localStorage.setItem(COMBAT_MODE_KEY, mode)
  }

  const currentFloor =
    manual?.floor ?? combat?.currentFloor ?? state?.activeRun?.currentFloor ?? state?.checkpointFloor ?? 1

  const advancing = advanceMutation.isPending || advanceManualMutation.isPending

  function handleAdvance() {
    setErrorMsg(null)
    // Un combate manual pendiente siempre se reanuda en manual, sin importar el toggle
    const useManual = combatMode === "manual" || Boolean(state?.activeRun?.pendingCombat)
    if (useManual) {
      advanceManualMutation.mutate(undefined, {
        onSuccess: (res) => {
          if (res.pending) {
            // Reanudación tras refresh: sin log nuevo, el HP viene del estado persistido
            const initialHp =
              res.log.length === 0
                ? Object.fromEntries(Object.entries(res.fighters).map(([id, f]) => [id, f.hp]))
                : undefined
            setManual({
              floor: res.floor,
              boss: res.boss,
              combatants: res.combatants,
              log: res.log,
              awaiting: res.awaiting,
              initialHp,
            })
            setCombat(null)
            setPhase("combat")
          } else {
            setCombat(res)
            setManual(null)
            setPhase("combat")
          }
        },
        onError: (e) => setErrorMsg(e.message),
      })
      return
    }
    advanceMutation.mutate(undefined, {
      onSuccess: (res) => {
        setCombat(res)
        setManual(null)
        setPhase("combat")
      },
      onError: (e) => setErrorMsg(e.message),
    })
  }

  function handleAction(action: EspiralPlayerAction) {
    if (!manual?.awaiting || actionMutation.isPending) return
    setErrorMsg(null)
    actionMutation.mutate(
      { actorId: manual.awaiting, action },
      {
        onSuccess: (res) => {
          if (res.pending) {
            setManual((m) => m && { ...m, log: [...m.log, ...res.log], awaiting: res.awaiting })
          } else {
            // Piso resuelto: anexar las entradas finales y dejar que el playback
            // desemboque en el aftermath con la respuesta completa
            setCombat(res)
            setManual((m) => m && { ...m, log: [...m.log, ...res.result.log], awaiting: null })
          }
        },
        onError: (e) => setErrorMsg(e.message),
      }
    )
  }

  function handleStart() {
    setErrorMsg(null)
    startMutation.mutate(selected, {
      onSuccess: () => {
        setSelected([])
        handleAdvance() // encadenar directo al primer combate — game feel inmediato
      },
      onError: (e) => setErrorMsg(e.message),
    })
  }

  function handleRetreat() {
    retreatMutation.mutate(undefined, {
      onSuccess: () => {
        setCombat(null)
        setPhase("hub")
      },
      onError: (e) => setErrorMsg(e.message),
    })
  }

  function handleRevive() {
    setErrorMsg(null)
    reviveMutation.mutate(undefined, {
      onSuccess: () => handleAdvance(),
      onError: (e) => setErrorMsg(e.message),
    })
  }

  return (
    <div className="page" style={{ position: "relative", minHeight: "calc(100vh - 60px)" }}>
      <ParallaxBackground floor={currentFloor} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <h1 className="brutalist-title">La Espiral</h1>
            <div className="brutalist-subtitle">Desciende. Sobrevive. Reclama los Ecos.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
            {state && <EnergyIndicator current={state.energyCurrent} lastRegenAt={state.energyLastRegenAt} />}
            {state && (
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  color: ECOS_CONFIG.color,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span style={{ filter: `drop-shadow(0 0 6px ${ECOS_CONFIG.color})` }}>{ECOS_CONFIG.icon}</span>
                {(state.ecos ?? 0).toLocaleString()}
                <span style={{ fontSize: "0.65rem", letterSpacing: "0.12em", color: `${ECOS_CONFIG.color}99` }}>
                  ECOS
                </span>
              </span>
            )}
          </div>
        </div>

        {errorMsg && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              color: "#e0245e",
              fontFamily: "var(--font-ui)",
              fontWeight: 600,
              marginBottom: "1rem",
            }}
          >
            {errorMsg}
          </motion.p>
        )}

        <AnimatePresence mode="wait">
          {phase === "hub" && (
            <HubView
              key="hub"
              state={state}
              onDescend={() => setPhase("team")}
              onContinue={handleAdvance}
              onRevive={handleRevive}
              advancing={advancing}
              reviving={reviveMutation.isPending}
              combatMode={combatMode}
              onModeChange={changeMode}
            />
          )}

          {phase === "team" && (
            <TeamSelectView
              key="team"
              inventory={inventory ?? []}
              selected={selected}
              onToggle={(id) =>
                setSelected((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
                )
              }
              onBack={() => {
                setSelected([])
                setPhase("hub")
              }}
              onConfirm={handleStart}
              starting={startMutation.isPending || advanceMutation.isPending}
              startFloor={(state?.checkpointFloor ?? 0) + 1}
            />
          )}

          {phase === "combat" && (manual || combat) && (
            <motion.div
              key={`combat-${manual?.floor ?? combat!.result.floor}`}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              {manual ? (
                <CombatStage
                  combatants={manual.combatants}
                  log={manual.log}
                  floor={manual.floor}
                  boss={manual.boss}
                  victory={manual.awaiting === null && combat ? combat.result.victory : null}
                  awaiting={manual.awaiting}
                  onAction={handleAction}
                  actionPending={actionMutation.isPending}
                  initialHp={manual.initialHp}
                  onFinished={() => {
                    setManual(null)
                    setPhase("aftermath")
                  }}
                />
              ) : (
                <CombatStage
                  combatants={combat!.result.combatants}
                  log={combat!.result.log}
                  floor={combat!.result.floor}
                  boss={combat!.result.boss}
                  victory={combat!.result.victory}
                  onFinished={() => setPhase("aftermath")}
                />
              )}
            </motion.div>
          )}

          {phase === "aftermath" && combat && (
            <AftermathView
              key="aftermath"
              combat={combat}
              onContinue={handleAdvance}
              onRetreat={handleRetreat}
              onRevive={handleRevive}
              onBackToHub={() => {
                setCombat(null)
                setPhase("hub")
              }}
              busy={advanceMutation.isPending || retreatMutation.isPending || reviveMutation.isPending}
              ecosBalance={state?.ecos ?? 0}
            />
          )}
        </AnimatePresence>

        {/* Misiones — siempre visibles en el hub */}
        {phase === "hub" && <MissionsPanel />}
      </div>
    </div>
  )
}

// ─── Hub ─────────────────────────────────────────────────────────────────────

function HubView({
  state,
  onDescend,
  onContinue,
  onRevive,
  advancing,
  reviving,
  combatMode,
  onModeChange,
}: {
  state: ReturnType<typeof useEspiralState>["data"]
  onDescend: () => void
  onContinue: () => void
  onRevive: () => void
  advancing: boolean
  reviving: boolean
  combatMode: CombatMode
  onModeChange: (mode: CombatMode) => void
}) {
  const run = state?.activeRun
  const isDead = run?.status === "dead"
  const noEnergy = (state?.energyCurrent ?? 0) < 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.8rem",
        padding: "3rem 1rem 2rem",
        textAlign: "center",
      }}
    >
      <FloorOdometer floor={run ? run.currentFloor : (state?.checkpointFloor ?? 0) + 1} />

      <div style={{ display: "flex", gap: "2.2rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Stat label="Checkpoint" value={state?.checkpointFloor ?? 0} />
        <Stat label="Récord" value={state?.bestFloorEver ?? 0} />
        {run && <Stat label="Ecos del run" value={run.ecosEarned} color={ECOS_CONFIG.color} />}
      </div>

      {isDead && run ? (
        <ReviveCard
          reviveWindowMsLeft={run.reviveWindowMsLeft ?? 0}
          onRevive={onRevive}
          reviving={reviving}
          ecos={state?.ecos ?? 0}
          floor={run.currentFloor}
        />
      ) : run ? (
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={onContinue}
          disabled={advancing}
          className="btn-primary"
          style={{ fontSize: "1.05rem", padding: "0.9rem 2.6rem", letterSpacing: "0.1em" }}
        >
          {advancing
            ? "Descendiendo…"
            : isBossFloor(run.currentFloor)
              ? `⚠ Enfrentar al jefe — Piso ${run.currentFloor}`
              : `Continuar descenso — Piso ${run.currentFloor}`}
        </motion.button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", alignItems: "center" }}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={onDescend}
            disabled={noEnergy}
            className="btn-primary"
            style={{
              fontSize: "1.05rem",
              padding: "0.9rem 2.6rem",
              letterSpacing: "0.1em",
              opacity: noEnergy ? 0.5 : 1,
            }}
          >
            Iniciar descenso ⚡1
          </motion.button>
          {noEnergy && (
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Sin energía — espera la regeneración
            </span>
          )}
        </div>
      )}

      {/* Modo de combate: auto clásico o manual por turnos */}
      <div
        data-testid="combat-mode-toggle"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "999px",
          padding: "0.28rem",
        }}
      >
        {(
          [
            { id: "auto" as const, label: "⚡ Auto", hint: "El combate se resuelve solo" },
            { id: "manual" as const, label: "🎮 Manual", hint: "Tú eliges cada acción: atacar, defender o canalizar" },
          ]
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onModeChange(m.id)}
            title={m.hint}
            aria-pressed={combatMode === m.id}
            data-testid={`combat-mode-${m.id}`}
            style={{
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: "0.72rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              border: "none",
              borderRadius: "999px",
              padding: "0.4rem 1.1rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: combatMode === m.id ? "var(--accent-aether, #7b2fff)" : "transparent",
              color: combatMode === m.id ? "#fff" : "var(--text-secondary)",
              boxShadow: combatMode === m.id ? "0 0 14px #7b2fff66" : "none",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <Link
        to="/altar-eco"
        style={{
          fontFamily: "var(--font-ui)",
          fontWeight: 700,
          fontSize: "0.85rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: ECOS_CONFIG.color,
          textDecoration: "none",
          borderBottom: `1px solid ${ECOS_CONFIG.color}55`,
          paddingBottom: "2px",
        }}
      >
        {ECOS_CONFIG.icon} Altar del Eco — invoca con tus Ecos
      </Link>
    </motion.div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: "1.6rem",
          color: color ?? "#fff",
        }}
      >
        {value.toLocaleString()}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "0.68rem",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </div>
    </div>
  )
}

function ReviveCard({
  reviveWindowMsLeft,
  onRevive,
  reviving,
  ecos,
  floor,
}: {
  reviveWindowMsLeft: number
  onRevive: () => void
  reviving: boolean
  ecos: number
  floor: number
}) {
  const [msLeft, setMsLeft] = useState(reviveWindowMsLeft)
  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => setMsLeft(Math.max(0, reviveWindowMsLeft - (Date.now() - start))), 1000)
    return () => clearInterval(id)
  }, [reviveWindowMsLeft])

  const canAfford = ecos >= ESPIRAL_REVIVE_COST_ECOS
  const min = Math.floor(msLeft / 60000)
  const sec = Math.floor((msLeft % 60000) / 1000)

  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        border: "1px solid #e0245e66",
        background: "rgba(224,36,94,0.08)",
        borderRadius: "12px",
        padding: "1.4rem 2rem",
        maxWidth: "420px",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: "1.1rem",
          color: "#e0245e",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: "0.5rem",
        }}
      >
        Tu equipo cayó en el piso {floor}
      </div>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 1rem" }}>
        Los Ecos aún resuenan. Puedes renacer y continuar desde este piso —{" "}
        <strong style={{ color: "#fff" }}>
          {min}:{String(sec).padStart(2, "0")}
        </strong>{" "}
        antes de que el Vacío reclame el run.
      </p>
      <motion.button
        whileHover={canAfford ? { scale: 1.04 } : undefined}
        whileTap={canAfford ? { scale: 0.97 } : undefined}
        onClick={onRevive}
        disabled={!canAfford || reviving || msLeft <= 0}
        className="btn-primary"
        style={{ opacity: canAfford && msLeft > 0 ? 1 : 0.45 }}
      >
        {reviving ? "Renaciendo…" : `Renacer — ${ECOS_CONFIG.icon} ${ESPIRAL_REVIVE_COST_ECOS} Ecos`}
      </motion.button>
      {!canAfford && (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          No tienes suficientes Ecos ({ecos}/{ESPIRAL_REVIVE_COST_ECOS})
        </div>
      )}
    </motion.div>
  )
}

// ─── Selección de equipo ─────────────────────────────────────────────────────

function TeamSelectView({
  inventory,
  selected,
  onToggle,
  onBack,
  onConfirm,
  starting,
  startFloor,
}: {
  inventory: InventoryItem[]
  selected: string[]
  onToggle: (id: string) => void
  onBack: () => void
  onConfirm: () => void
  starting: boolean
  startFloor: number
}) {
  const withEntity = useMemo(() => inventory.filter((i) => i.entity !== null), [inventory])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", flexWrap: "wrap", gap: "0.8rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "#fff", letterSpacing: "0.08em", margin: 0 }}>
          Elige 3 entidades — comenzarás en el piso {startFloor}
        </h2>
        <div style={{ display: "flex", gap: "0.7rem" }}>
          <button className="btn-secondary" onClick={onBack}>
            ← Volver
          </button>
          <motion.button
            whileHover={selected.length === 3 ? { scale: 1.05 } : undefined}
            className="btn-primary"
            disabled={selected.length !== 3 || starting}
            onClick={onConfirm}
            style={{ opacity: selected.length === 3 ? 1 : 0.45 }}
          >
            {starting ? "Invocando la Espiral…" : `Descender (${selected.length}/3) ⚡1`}
          </motion.button>
        </div>
      </div>

      {withEntity.length < 3 ? (
        <p style={{ fontFamily: "var(--font-ui)", color: "var(--text-secondary)" }}>
          Necesitas al menos 3 entidades. Ve a{" "}
          <Link to="/" style={{ color: "var(--accent-aether)" }}>
            The Altar
          </Link>{" "}
          e invoca tu escuadrón.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
            gap: "0.9rem",
          }}
        >
          {withEntity.map((item) => (
            <EntityPickCard
              key={item._id}
              item={item}
              selected={selected.includes(item._id)}
              order={selected.indexOf(item._id) + 1}
              onToggle={() => onToggle(item._id)}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

function EntityPickCard({
  item,
  selected,
  order,
  onToggle,
}: {
  item: InventoryItem
  selected: boolean
  order: number
  onToggle: () => void
}) {
  const entity = item.entity!
  const rareza = entity.rareza as Rareza
  const cfg = RARITY_CONFIG[rareza] ?? RARITY_CONFIG.dust
  const stats = getEffectiveStats({ rareza: entity.rareza, arquetipo: entity.arquetipo })
  const ability = getEspiralAbility({ rareza: entity.rareza, arquetipo: entity.arquetipo })
  const abilityDef = ESPIRAL_ABILITIES[ability]

  return (
    <motion.button
      layout
      data-testid="entity-pick-card"
      whileHover={{ scale: 1.03, y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      style={{
        position: "relative",
        textAlign: "left",
        background: selected ? `${cfg.color}14` : "rgba(255,255,255,0.03)",
        border: selected ? `2px solid ${cfg.color}` : "1px solid rgba(255,255,255,0.1)",
        borderRadius: "10px",
        padding: "0.8rem",
        cursor: "pointer",
        boxShadow: selected ? `0 0 20px ${cfg.color}44` : "none",
        transition: "box-shadow 0.2s ease",
      }}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: "absolute",
            top: "-9px",
            right: "-9px",
            width: "26px",
            height: "26px",
            borderRadius: "50%",
            background: cfg.color,
            color: "#000",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 12px ${cfg.color}`,
            zIndex: 2,
          }}
        >
          {order}
        </motion.div>
      )}
      <div style={{ display: "flex", gap: "0.7rem", alignItems: "center", marginBottom: "0.6rem" }}>
        <img
          src={entity.imageUrl}
          alt={entity.nombre}
          style={{
            width: "52px",
            height: "52px",
            objectFit: "cover",
            borderRadius: "8px",
            border: `1px solid ${cfg.color}88`,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: "0.85rem",
              color: "#fff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {entity.nombre}
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "0.68rem", color: cfg.color, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {cfg.icon} {cfg.label} · {entity.arquetipo}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.7rem", fontFamily: "var(--font-ui)", fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
        <span>♥ {stats.hp}</span>
        <span>⚔ {stats.atk}</span>
        <span>🛡 {stats.def}</span>
        <span>⚡ {stats.vel}</span>
      </div>
      {ability !== "none" && (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: "0.68rem", color: cfg.color }}>
          ✦ {abilityDef.nombre}
        </div>
      )}
    </motion.button>
  )
}

// ─── Aftermath: victoria/derrota tras el playback ────────────────────────────

function AftermathView({
  combat,
  onContinue,
  onRetreat,
  onRevive,
  onBackToHub,
  busy,
  ecosBalance,
}: {
  combat: AdvanceResponse
  onContinue: () => void
  onRetreat: () => void
  onRevive: () => void
  onBackToHub: () => void
  busy: boolean
  ecosBalance: number
}) {
  const victory = combat.result.victory
  const nextIsBoss = isBossFloor(combat.currentFloor)
  const canRevive = ecosBalance >= ESPIRAL_REVIVE_COST_ECOS

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.4rem",
        padding: "3rem 1rem",
        textAlign: "center",
      }}
    >
      {victory ? (
        <>
          <motion.h2
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2rem",
              fontWeight: 900,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#3ddc97",
              textShadow: "0 0 30px #3ddc9766",
              margin: 0,
            }}
          >
            Piso {combat.result.floor} superado
          </motion.h2>

          {combat.result.ecosDropped > 0 && <EcosDropReveal amount={combat.result.ecosDropped} />}

          {combat.checkpointFloor === combat.result.floor && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: "0.8rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#f0a500",
                border: "1px solid #f0a50066",
                background: "#f0a50012",
                borderRadius: "999px",
                padding: "0.35rem 1.2rem",
              }}
            >
              🏁 Checkpoint asegurado — piso {combat.checkpointFloor}
            </motion.div>
          )}

          <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.5rem" }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="btn-primary"
              onClick={onContinue}
              disabled={busy}
              style={{ fontSize: "1rem", padding: "0.8rem 2.2rem" }}
            >
              {busy
                ? "Descendiendo…"
                : nextIsBoss
                  ? `⚠ Desafiar al jefe — Piso ${combat.currentFloor}`
                  : `Seguir bajando — Piso ${combat.currentFloor}`}
            </motion.button>
            <button className="btn-secondary" onClick={onRetreat} disabled={busy}>
              Retirarse y bancar
            </button>
          </div>
        </>
      ) : (
        <>
          <motion.h2
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2rem",
              fontWeight: 900,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#e0245e",
              textShadow: "0 0 30px #e0245e66",
              margin: 0,
            }}
          >
            El Vacío te consumió
          </motion.h2>
          <p style={{ fontFamily: "var(--font-ui)", color: "var(--text-secondary)", maxWidth: "420px", margin: 0 }}>
            Caíste en el piso {combat.result.floor}. Puedes renacer con Ecos y reintentar este piso, o dejar que el
            run se desvanezca — tu checkpoint (piso {combat.checkpointFloor}) permanece.
          </p>
          <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", justifyContent: "center" }}>
            <motion.button
              whileHover={canRevive ? { scale: 1.05 } : undefined}
              className="btn-primary"
              onClick={onRevive}
              disabled={!canRevive || busy}
              style={{ opacity: canRevive ? 1 : 0.45 }}
            >
              {busy ? "…" : `Renacer — ${ECOS_CONFIG.icon} ${ESPIRAL_REVIVE_COST_ECOS} Ecos`}
            </motion.button>
            <button className="btn-secondary" onClick={onBackToHub} disabled={busy}>
              Aceptar el destino
            </button>
          </div>
        </>
      )}
    </motion.div>
  )
}

// ─── Misiones ────────────────────────────────────────────────────────────────

function MissionsPanel() {
  const { data } = useEspiralMissions()
  const claimMutation = useClaimMission()
  const missions = data?.missions ?? []

  if (missions.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      style={{ maxWidth: "680px", margin: "2.5rem auto 0" }}
    >
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
          textAlign: "center",
          marginBottom: "1rem",
        }}
      >
        ── Misiones del Vacío ──
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {missions.map((m) => {
          const pct = Math.min(100, (m.progress / m.target) * 100)
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${m.completed && !m.claimed ? `${ECOS_CONFIG.color}66` : "rgba(255,255,255,0.08)"}`,
                borderRadius: "10px",
                padding: "0.7rem 1rem",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: m.period === "daily" ? "#00e5ff" : "#a020f0",
                  border: `1px solid ${m.period === "daily" ? "#00e5ff44" : "#a020f044"}`,
                  borderRadius: "4px",
                  padding: "0.15rem 0.45rem",
                  flexShrink: 0,
                }}
              >
                {m.period === "daily" ? "Diaria" : "Semanal"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: "0.85rem", color: "#fff", marginBottom: "0.3rem" }}>
                  {m.descripcion}
                </div>
                <div style={{ height: "5px", background: "rgba(0,0,0,0.5)", borderRadius: "3px", overflow: "hidden" }}>
                  <motion.div
                    animate={{ width: `${pct}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    style={{
                      height: "100%",
                      background: ECOS_CONFIG.color,
                      boxShadow: `0 0 6px ${ECOS_CONFIG.color}`,
                    }}
                  />
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "0.72rem", color: "var(--text-secondary)", flexShrink: 0 }}>
                {m.progress}/{m.target}
              </span>
              {m.claimed ? (
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "0.72rem", color: ECOS_CONFIG.color, flexShrink: 0 }}>
                  ✓ Reclamada
                </span>
              ) : m.completed ? (
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => claimMutation.mutate(m.id)}
                  disabled={claimMutation.isPending}
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: "0.72rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    background: ECOS_CONFIG.color,
                    color: "#000",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.4rem 0.9rem",
                    cursor: "pointer",
                    boxShadow: `0 0 14px ${ECOS_CONFIG.color}66`,
                    flexShrink: 0,
                  }}
                >
                  {ECOS_CONFIG.icon} +{m.rewardEcos}
                </motion.button>
              ) : (
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "0.72rem", color: `${ECOS_CONFIG.color}88`, flexShrink: 0 }}>
                  {ECOS_CONFIG.icon} {m.rewardEcos}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </motion.section>
  )
}
