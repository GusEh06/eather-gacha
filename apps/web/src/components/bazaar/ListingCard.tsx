import type { MarketListing } from "../../hooks/useMarket"
import { RARITY_CONFIG } from "../../config/rarityConfig"
import { RarityBadge } from "../altar/RarityBadge"

interface Props {
  listing: MarketListing
  currentUserId?: string | null
  onBuy: (listing: MarketListing) => void
}

export function ListingCard({ listing, currentUserId, onBuy }: Props) {
  const { entitySnapshot, priceShards, sellerUsername, sellerId } = listing
  const rarity = entitySnapshot.rareza as keyof typeof RARITY_CONFIG
  const config = RARITY_CONFIG[rarity]
  const isOwn = sellerId === currentUserId

  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        alignItems: "center",
        borderColor: config ? `var(${config.cssVar})` : "var(--border-subtle)",
      }}
    >
      {/* Entity image */}
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
        <img
          src={entitySnapshot.imageUrl}
          alt={entitySnapshot.nombre}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            padding: "0.5rem",
            filter: `drop-shadow(0 2px 8px ${config?.color}66)`,
          }}
        />
      </div>

      {/* Entity name */}
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "0.9rem",
          textAlign: "center",
          color: "var(--text-primary)",
          letterSpacing: "0.06em",
        }}
      >
        {entitySnapshot.nombre}
      </p>

      {/* Rarity badge */}
      <RarityBadge rareza={rarity} />

      {/* Seller */}
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "0.75rem",
          color: "var(--text-secondary)",
          textAlign: "center",
        }}
      >
        by Aether Binder {sellerUsername}
      </p>

      {/* Price */}
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontWeight: 600,
          fontSize: "1rem",
          color: "var(--accent-gold)",
        }}
      >
        ◈ {priceShards.toLocaleString("en-US")}
      </p>

      {/* Buy button */}
      <button
        className="btn-primary"
        style={{ width: "100%", opacity: isOwn ? 0.4 : 1 }}
        disabled={isOwn}
        onClick={() => !isOwn && onBuy(listing)}
        title={isOwn ? "This is your listing" : undefined}
      >
        {isOwn ? "Your Listing" : "Buy"}
      </button>
    </div>
  )
}
