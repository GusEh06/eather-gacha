import { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "@tanstack/react-router"
import Particles, { initParticlesEngine } from "@tsparticles/react"
import { loadSlim } from "@tsparticles/slim"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@clerk/tanstack-react-start"
import { useInvoke, type InvokeResult } from "../../hooks/useInvoke"
import { rarityParticleConfig } from "../../config/particles"
import { useUserProfile, USER_PROFILE_KEY, type UserProfile } from "../../hooks/useUserProfile"
import { CtaSlot } from "../ui/CtaSlot"
import { AltarScene } from "./AltarScene"
import { EyesSequence } from "./EyesSequence"
import { EntityReveal } from "./EntityReveal"
import { X10Reveal } from "./X10Reveal"
import type { Rareza } from "../../../../../packages/shared/src/types"

type InvokePhase =
  | "idle"
  | "loading"
  | "activating"
  | "collapsing"
  | "eyes"
  | "revealing"
  | "x10_reveal"

// Module-level flag so the engine is only initialized once per page load
let particlesEngineReady = false

export function InvokeSequence() {
  const { isSignedIn } = useAuth()
  const queryClient = useQueryClient()
  const { mutate } = useInvoke()
  const navigate = useNavigate()

  const [phase, setPhase] = useState<InvokePhase>("idle")
  const [results, setResults] = useState<InvokeResult[]>([])
  const [invokeMode, setInvokeMode] = useState<"x1" | "x10">("x1")
  const [invokeError, setInvokeError] = useState<string | null>(null)
  const [showParticles, setShowParticles] = useState(false)
  const [particlesReady, setParticlesReady] = useState(particlesEngineReady)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize tsParticles engine once
  useEffect(() => {
    if (particlesEngineReady) return
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => {
      particlesEngineReady = true
      setParticlesReady(true)
    })
  }, [])

  // Shared profile hook (also used by Navbar — same cache key, no duplicate requests)
  const { data: profile } = useUserProfile()

  const handleInvoke = useCallback(
    (mode: "x1" | "x10") => {
      setInvokeMode(mode)
      setInvokeError(null)
      setPhase("loading")

      mutate(mode, {
        onSuccess: (data) => {
          setResults(data.results)

          // Optimistically update cached profile
          queryClient.setQueryData<UserProfile>(USER_PROFILE_KEY, (old) =>
            old
              ? {
                  ...old,
                  shards: data.newShards,
                  pityCounter: data.newPityCounter,
                  pityMythicCounter: data.newPityMythicCounter,
                }
              : old
          )

          // Start animation sequence
          setPhase("activating")
          containerRef.current?.classList.add("shake")

          const activatingMs = mode === "x1" ? 1500 : 1200

          setTimeout(() => {
            containerRef.current?.classList.remove("shake")
            setPhase("collapsing")

            setTimeout(() => {
              // Hit Stop — 70 ms pure-black pause for perceived impact
              setTimeout(() => {
                if (mode === "x1") {
                  setPhase("eyes")
                  setTimeout(() => {
                    setPhase("revealing")
                    // Fire particle burst
                    setShowParticles(true)
                    setTimeout(() => setShowParticles(false), 3000)
                  }, 1600)
                } else {
                  setPhase("x10_reveal")
                }
              }, 70)
            }, 400)
          }, activatingMs)
        },

        onError: (e) => {
          setPhase("idle")
          setInvokeError((e as Error).message ?? "Invocation failed. Try again.")
        },
      })
    },
    [mutate, queryClient]
  )

  const handleReset = useCallback(() => {
    setPhase("idle")
    setResults([])
  }, [])

  const shards = profile?.shards ?? 0
  const firstResult = results[0]
  const firstRareza = firstResult?.entity?.rareza as Rareza | undefined

  // ── Eyes phase ────────────────────────────────────────────────────────────
  if (phase === "eyes" && firstRareza) {
    return <EyesSequence rareza={firstRareza} />
  }

  // ── Revealing phase (x1) ──────────────────────────────────────────────────
  if (phase === "revealing" && firstResult) {
    return (
      <>
        {particlesReady && showParticles && firstRareza && (
          <Particles
            id="invoke-particles"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            options={rarityParticleConfig[firstRareza] as any}
          />
        )}
        <EntityReveal
          result={firstResult}
          onContinue={handleReset}
          onListBazaar={() =>
            navigate({ to: "/bazaar", search: { sell: firstResult.userEntityId } })
          }
        />
      </>
    )
  }

  // ── x10 reveal ────────────────────────────────────────────────────────────
  if (phase === "x10_reveal") {
    return <X10Reveal results={results} onContinue={handleReset} />
  }

  // ── Idle / Loading / Activating / Collapsing ──────────────────────────────
  const isLoadingOrBusy =
    phase === "loading" || phase === "activating" || phase === "collapsing"
  const isCollapsing = phase === "collapsing"
  const isActivating = phase === "activating"

  return (
    <div
      id="altar-container"
      ref={containerRef}
      style={{
        height: "100%",
        width: "100%",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        borderRadius: "2px",
      }}
    >
      {/* Atmospheric background — fog + floating runes */}
      <div className="altar-fog-layer" aria-hidden="true" />
      <span className="altar-rune" aria-hidden="true" style={{ top: "12%", left: "8%",  fontSize: "1.8rem", animationDelay: "0s"   }}>ᚱ</span>
      <span className="altar-rune" aria-hidden="true" style={{ top: "20%", right: "9%", fontSize: "1.4rem", animationDelay: "1.5s" }}>ᛟ</span>
      <span className="altar-rune" aria-hidden="true" style={{ bottom: "18%", left: "6%", fontSize: "2rem",  animationDelay: "3s"   }}>ᚦ</span>
      <span className="altar-rune" aria-hidden="true" style={{ bottom: "14%", right: "7%", fontSize: "1.6rem", animationDelay: "2.2s" }}>ᛉ</span>
      <AltarScene
        shards={shards}
        onInvoke={handleInvoke}
        isLoading={isLoadingOrBusy}
      />

      {/* Invoke error (e.g. insufficient shards, server error) */}
      {invokeError && phase === "idle" && (
        <div
          style={{
            position: "absolute",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(192,57,43,0.15)",
            border: "1px solid var(--accent-blood)",
            borderRadius: "6px",
            padding: "0.6rem 1.25rem",
            fontFamily: "var(--font-ui)",
            color: "var(--accent-blood)",
            fontSize: "0.9rem",
            whiteSpace: "nowrap",
          }}
        >
          {invokeError}
        </div>
      )}

      {/* Black overlay — fades in during collapsing, slightly dimmed during activating */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: isCollapsing ? 1 : isActivating ? 0.25 : 0,
        }}
        transition={{ duration: isCollapsing ? 0.4 : 0.2 }}
        style={{
          position: "absolute",
          inset: 0,
          background: "#000000",
          pointerEvents: "none",
        }}
      />



    </div>
  )
}
