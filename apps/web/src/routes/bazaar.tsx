import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useAuth } from "@clerk/tanstack-react-start"
import {
  useMarketListings,
  useMarketSell,
  useMarketBuy,
  type MarketListing,
} from "../hooks/useMarket"
import { useInventory, type InventoryItem } from "../hooks/useInventory"
import { ListingCard } from "../components/bazaar/ListingCard"
import { ListingFilters } from "../components/bazaar/ListingFilters"
import { SellModal } from "../components/bazaar/SellModal"
import { BuyModal } from "../components/bazaar/BuyModal"
import { NON_BAZAAR_RARITIES } from "../config/rarityConfig"

export const Route = createFileRoute("/bazaar")({
  component: BazaarPage,
  validateSearch: (search: Record<string, unknown>) => ({
    sell: typeof search.sell === "string" ? search.sell : undefined,
  }),
})

function BazaarPage() {
  const { userId, isSignedIn } = useAuth()
  const { sell: sellId } = Route.useSearch()
  const [filters, setFilters] = useState({ rarity: "", sort: "newest" })
  const [sellTarget, setSellTarget] = useState<InventoryItem | null>(null)
  const [buyTarget, setBuyTarget] = useState<MarketListing | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: listings, isLoading, isError } = useMarketListings(filters)
  const { data: inventory } = useInventory()
  const sellMutation = useMarketSell()
  const buyMutation = useMarketBuy()

  // Auto-open SellModal when navigated from EntityReveal with ?sell=<userEntityId>
  useEffect(() => {
    if (!sellId || !inventory) return
    const item = inventory.find((i) => i._id === sellId)
    if (item) setSellTarget(item)
  }, [sellId, inventory])

  // Items the current user can list on the Bazaar
  const sellableItems = (inventory ?? []).filter(
    (item) =>
      item.entity &&
      !NON_BAZAAR_RARITIES.includes(item.entity.rareza as (typeof NON_BAZAAR_RARITIES)[number])
  )

  function handleSellConfirm(priceShards: number) {
    if (!sellTarget) return
    setErrorMsg(null)
    sellMutation.mutate(
      { userEntityId: sellTarget._id, priceShards },
      {
        onSuccess: () => setSellTarget(null),
        onError: (e) => setErrorMsg(e.message),
      }
    )
  }

  function handleBuyConfirm() {
    if (!buyTarget) return
    setErrorMsg(null)
    buyMutation.mutate(
      { listingId: buyTarget._id },
      {
        onSuccess: () => setBuyTarget(null),
        onError: (e) => setErrorMsg(e.message),
      }
    )
  }

  return (
    <div className="page">
      {/* Atmospheric background */}
      <div className="bazaar-vignette" aria-hidden="true" />

      {/* Header */}
      <div>
        <h1 className="brutalist-title">
          El Bazar
        </h1>
        <div className="brutalist-subtitle">
          Intercambia Personajes por Shards
        </div>
      </div>

      {/* Sell panel — only shown when signed in with listable entities */}
      {isSignedIn && sellableItems.length > 0 && (
        <div
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
            }}
          >
            {sellableItems.length} {sellableItems.length === 1 ? "entidad disponible" : "entidades disponibles"}
          </span>
          <select
            value=""
            onChange={(e) => {
              const item = sellableItems.find((i) => i._id === e.target.value)
              if (item) setSellTarget(item)
            }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "1rem",
              background: "#000",
              color: "#ff3399",
              border: "4px solid #000",
              boxShadow: "4px 4px 0 #ccff00",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              textTransform: "uppercase",
              appearance: "none",
            }}
          >
            <option value="" disabled>
              Listar una entidad…
            </option>
            {sellableItems.map((item) => (
              <option key={item._id} value={item._id}>
                {item.entity?.nombre} ({item.entity?.rareza})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filters */}
      <ListingFilters rarity={filters.rarity} sort={filters.sort} onChange={setFilters} />

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

      {/* Listings */}
      {isLoading ? (
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
          Cargando anuncios…
        </p>
      ) : isError ? (
        <p style={{ color: "var(--accent-blood)", fontFamily: "var(--font-ui)" }}>
          Error al cargar los anuncios.
        </p>
      ) : !listings || listings.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "#000",
            background: "#ccff00",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            border: "6px solid #000",
            boxShadow: "12px 12px 0 #000",
            maxWidth: "480px",
            textTransform: "uppercase"
          }}
        >
          <p>No se encontraron anuncios</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {listings.map((listing) => (
            <ListingCard
              key={listing._id}
              listing={listing}
              currentUserId={userId ?? null}
              onBuy={setBuyTarget}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {sellTarget && (
        <SellModal
          item={sellTarget}
          onClose={() => {
            setSellTarget(null)
            setErrorMsg(null)
          }}
          onConfirm={handleSellConfirm}
          isLoading={sellMutation.isPending}
        />
      )}
      {buyTarget && (
        <BuyModal
          listing={buyTarget}
          onClose={() => {
            setBuyTarget(null)
            setErrorMsg(null)
          }}
          onConfirm={handleBuyConfirm}
          isLoading={buyMutation.isPending}
        />
      )}
    </div>
  )
}
