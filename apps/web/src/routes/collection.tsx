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
        <div>
          <h1 className="brutalist-title">
            Colección
          </h1>
          <div className="brutalist-subtitle">
            Tus Entidades Vinculadas
          </div>
        </div>
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "#000",
            background: "#ff3399",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            border: "6px solid #000",
            boxShadow: "12px 12px 0 #000",
            maxWidth: "480px",
            textTransform: "uppercase"
          }}
        >
          <p>Inicia Sesión para ver tu Colección</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div>
        <h1 className="brutalist-title">
          Colección
        </h1>
        <div className="brutalist-subtitle">
          Tus Entidades Vinculadas
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
          Cargando tu colección…
        </p>
      ) : isError ? (
        <p style={{ color: "var(--accent-blood)", fontFamily: "var(--font-ui)" }}>
          Error al cargar la colección.
        </p>
      ) : !inventory || inventory.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "#000",
            background: "#00ffff",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            border: "6px solid #000",
            boxShadow: "12px 12px 0 #000",
            maxWidth: "480px",
            textTransform: "uppercase"
          }}
        >
          <p>No se encontraron personajes</p>
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
            {inventory.length} {inventory.length === 1 ? "entidad vinculada" : "entidades vinculadas"}
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
                      width: "100%",
                      height: "140px",
                      overflow: "hidden",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      "--rarity-color": config?.color,
                    } as React.CSSProperties}
                  >
                    {item.entity?.imageUrl ? (
                      <img
                        src={item.entity.imageUrl}
                        alt={item.entity.nombre ?? "Entity"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          padding: "0.5rem",
                          filter: `drop-shadow(0 2px 8px ${config?.color}66)`,
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: "2.5rem", color: config?.color }}>{config?.icon ?? "◈"}</span>
                    )}
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
                      Listar en el Bazar
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
