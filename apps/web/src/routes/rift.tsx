import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useAuth } from "@clerk/tanstack-react-start"
import { useRiftCurrent, useRiftBuy } from "../hooks/useRift"
import { RiftSlot } from "../components/rift/RiftSlot"
import { RiftTimer } from "../components/rift/RiftTimer"

export const Route = createFileRoute("/rift")({ component: RiftPage })

function RiftPage() {
  const { isSignedIn } = useAuth()
  const { data: rift, isLoading, isError } = useRiftCurrent()
  const buyMutation = useRiftBuy()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [pendingSlot, setPendingSlot] = useState<number | null>(null)

  function handleBuy(slotIndex: number) {
    if (!isSignedIn) {
      setErrorMsg("Sign in to purchase from the Rift.")
      return
    }
    setErrorMsg(null)
    setPendingSlot(slotIndex)
    buyMutation.mutate(
      { slotIndex },
      {
        onError: (e) => {
          setErrorMsg(e.message)
          setPendingSlot(null)
        },
        onSuccess: () => setPendingSlot(null),
      }
    )
  }

  return (
    <div className="page">
      {/* Atmospheric background — portal swirl */}
      <div className="rift-portal-bg" aria-hidden="true" />

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2rem",
            color: "var(--accent-aether)",
            letterSpacing: "0.1em",
          }}
        >
          The Rift
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>
          Entities drift through the rift for a limited time. Buy directly with Shards.
        </p>
        <div
          style={{
            marginTop: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
            }}
          >
            Closes in:
          </span>
          {rift ? (
            <RiftTimer expiresAt={rift.expiresAt} />
          ) : (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.4rem",
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
              }}
            >
              --:--:--
            </span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <p
          style={{
            color: "var(--accent-blood)",
            fontFamily: "var(--font-ui)",
            marginBottom: "1rem",
            fontSize: "0.9rem",
          }}
        >
          {errorMsg}
        </p>
      )}

      {/* Content */}
      {isLoading ? (
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
          Loading rift…
        </p>
      ) : isError ? (
        <p style={{ color: "var(--accent-blood)", fontFamily: "var(--font-ui)" }}>
          Failed to load Rift rotation.
        </p>
      ) : rift ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "1.5rem",
            maxWidth: "960px",
          }}
        >
          {rift.slots.map((slot) => (
            <RiftSlot
              key={slot.index}
              slot={slot}
              index={slot.index}
              onBuy={handleBuy}
              isLoading={pendingSlot === slot.index}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
