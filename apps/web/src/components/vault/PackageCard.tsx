export interface VaultPackage {
  id: string
  name: string
  shards: number
  bonus: number
  price: string
}

interface Props {
  pkg: VaultPackage
  onSelect: (pkg: VaultPackage) => void
}

export function PackageCard({ pkg, onSelect }: Props) {
  const isSingularity = pkg.id === "singularity_core"

  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        alignItems: "center",
        textAlign: "center",
        border: isSingularity
          ? "2px solid transparent"
          : "1px solid var(--border-subtle)",
        background: isSingularity
          ? "linear-gradient(var(--bg-elevated), var(--bg-elevated)) padding-box, linear-gradient(90deg,#ff0080,#ff8c00,#ffe100,#00ff88,#00cfff,#7b2fff,#ff0080) border-box"
          : undefined,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Black hole animation — Singularity Core only */}
      {isSingularity && (
        <div
          className="black-hole"
          aria-hidden="true"
          style={{ position: "relative", zIndex: 0 }}
        />
      )}

      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.1rem",
          color: isSingularity ? "var(--accent-aether)" : "var(--text-primary)",
          letterSpacing: "0.06em",
          position: "relative",
          zIndex: 1,
        }}
      >
        {pkg.name}
      </h2>

      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "1.4rem",
          color: "var(--accent-gold)",
          fontWeight: 700,
          position: "relative",
          zIndex: 1,
        }}
      >
        ◈ {pkg.shards.toLocaleString("en-US")}
      </p>

      {pkg.bonus > 0 && (
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.85rem",
            color: "var(--rarity-nebula)",
            position: "relative",
            zIndex: 1,
          }}
        >
          + {pkg.bonus.toLocaleString("en-US")} bonus
        </p>
      )}

      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontWeight: 600,
          fontSize: "1rem",
          color: "var(--text-secondary)",
          marginTop: pkg.bonus > 0 ? 0 : "0.25rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        {pkg.price}
      </p>

      <button
        className="btn-primary"
        style={{ width: "100%", position: "relative", zIndex: 1 }}
        onClick={() => onSelect(pkg)}
      >
        Adquirir
      </button>
    </div>
  )
}
