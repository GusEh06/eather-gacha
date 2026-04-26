import type { VaultPackage } from "./PackageCard"

interface Props {
  pkg: VaultPackage | null
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
  error?: string | null
}

export function ConfirmModal({ pkg, onConfirm, onCancel, loading, error }: Props) {
  if (!pkg) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{
          maxWidth: "420px",
          width: "90%",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          border: "1px solid var(--border-active)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.3rem",
            color: "var(--accent-aether)",
            textAlign: "center",
            letterSpacing: "0.08em",
          }}
        >
          Confirm Purchase
        </h2>

        <p
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--text-secondary)",
            textAlign: "center",
            fontSize: "0.9rem",
          }}
        >
          You are about to purchase
        </p>

        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.15rem",
            textAlign: "center",
            color: "var(--text-primary)",
            letterSpacing: "0.06em",
          }}
        >
          {pkg.name}
        </p>

        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "1.4rem",
            color: "var(--accent-gold)",
            textAlign: "center",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          ◈ {pkg.shards.toLocaleString("en-US")}
          {pkg.bonus > 0 && (
            <span
              style={{
                color: "var(--rarity-nebula)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              +{pkg.bonus.toLocaleString("en-US")} bonus
            </span>
          )}
        </p>

        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontWeight: 600,
            color: "var(--text-secondary)",
            textAlign: "center",
          }}
        >
          {pkg.price} — secured by Stripe
        </p>

        {error && (
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.85rem",
              color: "var(--accent-blood)",
              textAlign: "center",
              border: "1px solid var(--accent-blood)",
              borderRadius: "4px",
              padding: "0.4rem 0.75rem",
            }}
          >
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
          <button
            style={{
              flex: 1,
              fontFamily: "var(--font-ui)",
              fontWeight: 600,
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: "4px",
              color: "var(--text-secondary)",
              padding: "0.5rem",
              cursor: "pointer",
            }}
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Redirecting…" : "Proceed to Payment"}
          </button>
        </div>
      </div>
    </div>
  )
}
