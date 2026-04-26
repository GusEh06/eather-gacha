import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useCheckout } from "../hooks/useVault"
import { PackageCard } from "../components/vault/PackageCard"
import { ConfirmModal } from "../components/vault/ConfirmModal"
import type { VaultPackage } from "../components/vault/PackageCard"

export const Route = createFileRoute("/vault")({ component: VaultPage })

const PACKAGES: VaultPackage[] = [
  { id: "spark_of_aether",  name: "Spark of Aether",  shards: 100,  bonus: 0,    price: "$1.99" },
  { id: "astral_fragment",  name: "Astral Fragment",   shards: 300,  bonus: 50,   price: "$4.99" },
  { id: "nova_surge",       name: "Nova Surge",        shards: 700,  bonus: 150,  price: "$9.99" },
  { id: "singularity_core", name: "Singularity Core",  shards: 1600, bonus: 400,  price: "$19.99" },
]

function VaultPage() {
  const [selectedPkg, setSelectedPkg] = useState<VaultPackage | null>(null)
  const checkout = useCheckout()

  // Detect Stripe return query params (success / cancelled)
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  )
  const isSuccess = params.get("success") === "true"
  const isCancelled = params.get("cancelled") === "true"

  function handleConfirm() {
    if (!selectedPkg) return
    checkout.mutate(selectedPkg.id, {
      onError: () => {
        // Keep modal open to show error
      },
    })
  }

  return (
    <div className="page">
      {/* Atmospheric background — torch glow */}
      <div className="vault-torchlight" aria-hidden="true" />

      {/* ── Stripe return banners ── */}
      {isSuccess && (
        <div
          style={{
            background: "rgba(76,175,80,0.12)",
            border: "1px solid var(--rarity-nebula)",
            borderRadius: "6px",
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
            fontFamily: "var(--font-ui)",
            color: "var(--rarity-nebula)",
            fontSize: "0.95rem",
          }}
        >
          Payment successful — your Shards have been credited to your account!
        </div>
      )}

      {isCancelled && (
        <div
          style={{
            background: "rgba(192,57,43,0.12)",
            border: "1px solid var(--accent-blood)",
            borderRadius: "6px",
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
            fontFamily: "var(--font-ui)",
            color: "var(--accent-blood)",
            fontSize: "0.95rem",
          }}
        >
          Payment cancelled. Your Shards were not charged.
        </div>
      )}

      {/* ── Header ── */}
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "2rem",
          color: "var(--accent-aether)",
          letterSpacing: "0.1em",
          marginBottom: "0.5rem",
        }}
      >
        The Aether Vault
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
        Acquire Shards to power your invocations. Secured by Stripe.
      </p>

      {/* ── Package grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1.5rem",
          maxWidth: "960px",
        }}
      >
        {PACKAGES.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} onSelect={setSelectedPkg} />
        ))}
      </div>

      {/* ── Confirmation modal ── */}
      <ConfirmModal
        pkg={selectedPkg}
        onConfirm={handleConfirm}
        onCancel={() => {
          if (!checkout.isPending) setSelectedPkg(null)
        }}
        loading={checkout.isPending}
        error={checkout.error ? (checkout.error as Error).message : null}
      />
    </div>
  )
}
