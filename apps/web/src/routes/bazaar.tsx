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
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2rem",
            color: "var(--accent-aether)",
            letterSpacing: "0.1em",
          }}
        >
          The Hollow Bazaar
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>
          Trade entities with other Aether Binders. All transactions in Shards.
        </p>
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
            {sellableItems.length} listable {sellableItems.length === 1 ? "entity" : "entities"}
          </span>
          <select
            value=""
            onChange={(e) => {
              const item = sellableItems.find((i) => i._id === e.target.value)
              if (item) setSellTarget(item)
            }}
            style={{
              fontFamily: "var(--font-ui)",
              fontWeight: 600,
              fontSize: "0.9rem",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-active)",
              borderRadius: "4px",
              padding: "0.4rem 0.75rem",
              cursor: "pointer",
            }}
          >
            <option value="" disabled>
              List an entity…
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
          Loading listings…
        </p>
      ) : isError ? (
        <p style={{ color: "var(--accent-blood)", fontFamily: "var(--font-ui)" }}>
          Failed to load listings.
        </p>
      ) : !listings || listings.length === 0 ? (
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
          <p>No listings yet. Be the first to list an entity.</p>
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
