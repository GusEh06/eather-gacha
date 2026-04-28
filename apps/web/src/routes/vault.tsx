import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useCheckout } from "../hooks/useVault"
import { PackageCard } from "../components/vault/PackageCard"
import { ConfirmModal } from "../components/vault/ConfirmModal"
import { CtaSlot } from "../components/ui/CtaSlot"
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
            background: "#ccff00",
            border: "4px solid #000",
            boxShadow: "6px 6px 0 #000",
            padding: "1rem",
            marginBottom: "1.5rem",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            color: "#000",
            fontSize: "1rem",
            textTransform: "uppercase",
            maxWidth: "960px"
          }}
        >
          ¡Pago exitoso — tus Shards han sido acreditados a tu cuenta!
        </div>
      )}

      {isCancelled && (
        <div
          style={{
            background: "#ff3399",
            border: "4px solid #000",
            boxShadow: "6px 6px 0 #000",
            padding: "1rem",
            marginBottom: "1.5rem",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            color: "#000",
            fontSize: "1rem",
            textTransform: "uppercase",
            maxWidth: "960px"
          }}
        >
          Pago cancelado. No se cobraron tus Shards.
        </div>
      )}

      {/* ── Header ── */}
      <div>
        <h1 className="brutalist-title">
          La Bóveda
        </h1>
        <div className="brutalist-subtitle">
          Adquiere Shards. Protegido por Stripe.
        </div>
      </div>

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

      {/* ── CTA slot — quick-pick gold package shortcut ── */}
      <CtaSlot>
        <button
          className="aether-cta aether-cta--gold"
          onClick={() =>
            setSelectedPkg(PACKAGES.find((p) => p.id === "nova_surge") ?? null)
          }
        >
          Adquirir Nova Surge
        </button>
      </CtaSlot>
    </div>
  )
}
