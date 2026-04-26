import { useState } from "react"
import type { InventoryItem } from "../../hooks/useInventory"
import { RARITY_CONFIG } from "../../config/rarityConfig"
import { RarityBadge } from "../altar/RarityBadge"

interface Props {
  item: InventoryItem
  onClose: () => void
  onConfirm: (priceShards: number) => void
  isLoading: boolean
  error?: string | null
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
  maxWidth: "400px",
  width: "90vw",
}

export function SellModal({ item, onClose, onConfirm, isLoading, error }: Props) {
  const [price, setPrice] = useState(100)
  const entity = item.entity
  const rarity = (entity?.rareza ?? "dust") as keyof typeof RARITY_CONFIG
  const config = RARITY_CONFIG[rarity]
  const tribute = Math.floor(price * 0.05)
  const receives = Math.floor(price * 0.95)

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
          List on Bazaar
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
            {entity?.nombre ?? "Unknown"}
          </p>
          <div style={{ display: "flex", justifyContent: "center", marginTop: "0.4rem" }}>
            <RarityBadge rareza={rarity} />
          </div>
        </div>

        {/* Price input */}
        <label
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            display: "block",
            marginBottom: "0.3rem",
          }}
        >
          Listing Price (Shards)
        </label>
        <input
          type="number"
          min={1}
          step={1}
          value={price}
          onChange={(e) => setPrice(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          style={{
            fontFamily: "var(--font-ui)",
            fontWeight: 600,
            fontSize: "1rem",
            background: "var(--bg-void)",
            color: "var(--accent-gold)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "4px",
            padding: "0.4rem 0.75rem",
            width: "100%",
            marginBottom: "0.75rem",
          }}
        />

        {/* Tribute breakdown */}
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
              color: "var(--text-secondary)",
            }}
          >
            <span>Bazaar tribute (5%)</span>
            <span style={{ color: "var(--accent-blood)" }}>
              − ◈ {tribute.toLocaleString("en-US")}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "0.3rem",
              color: "var(--accent-gold)",
              fontWeight: 600,
            }}
          >
            <span>You receive</span>
            <span>◈ {receives.toLocaleString("en-US")}</span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.85rem",
              color: "var(--accent-blood)",
              marginBottom: "0.75rem",
            }}
          >
            {error}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn-primary"
            style={{ flex: 1, opacity: isLoading ? 0.6 : 1 }}
            disabled={isLoading || price < 1}
            onClick={() => onConfirm(price)}
          >
            {isLoading ? "Listing…" : "List on Bazaar"}
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
