import type { MarketListing } from "../../hooks/useMarket"
import { RARITY_CONFIG } from "../../config/rarityConfig"
import { RarityBadge } from "../altar/RarityBadge"

interface Props {
  listing: MarketListing
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(10,10,15,0.88)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 200,
}

const modalStyle: React.CSSProperties = {
  minWidth: "320px",
  maxWidth: "420px",
  width: "90vw",
}

export function BuyModal({ listing, onClose, onConfirm, isLoading }: Props) {
  const { entitySnapshot, priceShards, sellerUsername } = listing
  const rarity = entitySnapshot.rareza as keyof typeof RARITY_CONFIG
  const config = RARITY_CONFIG[rarity]
  const tribute = Math.floor(priceShards * 0.05)
  const sellerReceives = Math.floor(priceShards * 0.95)

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card" style={modalStyle}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.2rem",
            color: "var(--accent-aether)",
            marginBottom: "1rem",
            letterSpacing: "0.08em",
          }}
        >
          Confirm Purchase
        </h2>

        {/* Entity preview */}
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
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
              fontSize: "1rem",
              marginTop: "0.5rem",
              letterSpacing: "0.06em",
            }}
          >
            {entitySnapshot.nombre}
          </p>
          <div style={{ display: "flex", justifyContent: "center", marginTop: "0.4rem" }}>
            <RarityBadge rareza={rarity} />
          </div>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              marginTop: "0.4rem",
            }}
          >
            Sold by Aether Binder {sellerUsername}
          </p>
        </div>

        {/* Price breakdown */}
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.85rem",
            background: "var(--bg-void)",
            borderRadius: "4px",
            padding: "0.5rem 0.75rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: "var(--text-primary)",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            <span>You pay</span>
            <span style={{ color: "var(--accent-gold)" }}>
              ◈ {priceShards.toLocaleString("en-US")}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: "var(--text-secondary)",
              marginTop: "0.3rem",
            }}
          >
            <span>Bazaar tribute (5%)</span>
            <span style={{ color: "var(--accent-blood)" }}>
              ◈ {tribute.toLocaleString("en-US")} destroyed
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: "var(--text-secondary)",
              marginTop: "0.3rem",
            }}
          >
            <span>Seller receives</span>
            <span>◈ {sellerReceives.toLocaleString("en-US")}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn-primary"
            style={{ flex: 1, opacity: isLoading ? 0.6 : 1 }}
            disabled={isLoading}
            onClick={onConfirm}
          >
            {isLoading ? "Buying…" : "Confirm Purchase"}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              flex: 1,
              fontFamily: "var(--font-ui)",
              fontWeight: 600,
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "4px",
              padding: "0.5rem 1.25rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
