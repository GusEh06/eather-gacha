import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useAuth } from "@clerk/tanstack-react-start"
import { useInventory, type InventoryItem } from "../hooks/useInventory"
import { useMarketSell } from "../hooks/useMarket"
import { RARITY_CONFIG, NON_BAZAAR_RARITIES } from "../config/rarityConfig"
import { RarityBadge } from "../components/altar/RarityBadge"
import { SellModal } from "../components/bazaar/SellModal"

export const Route = createFileRoute("/collection")({ component: CollectionPage })

function CollectionPage() {
  const { isSignedIn } = useAuth()
  const { data: inventory, isLoading, isError } = useInventory()
  const sellMutation = useMarketSell()
  const [sellTarget, setSellTarget] = useState<InventoryItem | null>(null)
  const [sellError, setSellError] = useState<string | null>(null)

  function handleSellConfirm(priceShards: number) {
    if (!sellTarget) return
    setSellError(null)
    sellMutation.mutate(
      { userEntityId: sellTarget._id, priceShards },
      {
        onSuccess: () => setSellTarget(null),
        onError: (e) => setSellError(e.message),
      }
    )
  }

  if (!isSignedIn) {
    return (
      <div className="page">
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2rem",
            color: "var(--accent-aether)",
            letterSpacing: "0.1em",
            marginBottom: "1.5rem",
          }}
        >
          Collection
        </h1>
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui)",
            border: "1px dashed var(--border-subtle)",
            borderRadius: "8px",
            maxWidth: "480px",
          }}
        >
          <p style={{ fontSize: "2rem", marginBottom: "1rem" }}>◈</p>
          <p>Sign in to see your collection.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "2rem",
          color: "var(--accent-aether)",
          letterSpacing: "0.1em",
          marginBottom: "0.5rem",
        }}
      >
        Collection
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
        Your bound entities, Aether Binder.
      </p>

      {isLoading ? (
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
          Loading your collection…
        </p>
      ) : isError ? (
        <p style={{ color: "var(--accent-blood)", fontFamily: "var(--font-ui)" }}>
          Failed to load collection.
        </p>
      ) : !inventory || inventory.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui)",
            border: "1px dashed var(--border-subtle)",
            borderRadius: "8px",
            maxWidth: "480px",
          }}
        >
          <p style={{ fontSize: "2rem", marginBottom: "1rem" }}>◈</p>
          <p>No entities yet. Visit The Altar to begin your collection.</p>
        </div>
      ) : (
        <>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              marginBottom: "1.5rem",
            }}
          >
            {inventory.length} {inventory.length === 1 ? "entity" : "entities"} bound
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {inventory.map((item) => {
              const rarity = (item.entity?.rareza ?? "dust") as keyof typeof RARITY_CONFIG
              const config = RARITY_CONFIG[rarity]
              return (
                <div
                  key={item._id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    alignItems: "center",
                    borderColor: config ? `var(${config.cssVar})` : "var(--border-subtle)",
                  }}
                >
                  <div
                    className="entity-idle"
                    style={{
                      fontSize: "2.5rem",
                      color: config?.color,
                      "--rarity-color": config?.color,
                    } as React.CSSProperties}
                  >
                    {config?.icon ?? "◈"}
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.85rem",
                      textAlign: "center",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {item.entity?.nombre ?? "Unknown"}
                  </p>
                  <RarityBadge rareza={rarity} />
                  <p
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      textTransform: "capitalize",
                    }}
                  >
                    via {item.obtainedVia}
                  </p>
                  {/* List on Bazaar — only for tradable rarities */}
                  {!NON_BAZAAR_RARITIES.includes(
                    item.entity?.rareza as (typeof NON_BAZAAR_RARITIES)[number]
                  ) && (
                    <button
                      className="btn-secondary"
                      style={{ width: "100%", marginTop: "0.25rem", fontSize: "0.78rem" }}
                      onClick={() => {
                        setSellTarget(item)
                        setSellError(null)
                      }}
                    >
                      List on Bazaar
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Sell modal (opened from card buttons) */}
      {sellTarget && (
        <SellModal
          item={sellTarget}
          onClose={() => {
            setSellTarget(null)
            setSellError(null)
          }}
          onConfirm={handleSellConfirm}
          isLoading={sellMutation.isPending}
          error={sellError}
        />
      )}
    </div>
  )
}
