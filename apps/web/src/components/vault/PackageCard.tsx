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
          ? "6px solid #00ffff"
          : "4px solid #000",
        background: isSingularity
          ? "#110518"
          : "#000",
        boxShadow: isSingularity
          ? "12px 12px 0 #00ffff"
          : "8px 8px 0 #ff3399",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Brutalist Singularity Indicator */}
      {isSingularity && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, height: "8px",
            background: "#00ffff"
          }}
        />
      )}

      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.2rem",
          fontWeight: 900,
          color: isSingularity ? "#00ffff" : "#fff",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          position: "relative",
          zIndex: 1,
        }}
      >
        {pkg.name}
      </h2>

      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.8rem",
          fontWeight: 900,
          color: "#ccff00",
          textShadow: "2px 2px 0 #000",
          position: "relative",
          zIndex: 1,
        }}
      >
        ◈ {pkg.shards.toLocaleString("en-US")}
      </p>

      {pkg.bonus > 0 && (
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.9rem",
            fontWeight: 900,
            color: "#ff3399",
            textTransform: "uppercase",
            position: "relative",
            zIndex: 1,
          }}
        >
          + {pkg.bonus.toLocaleString("en-US")} BONUS
        </p>
      )}

      <p
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: "1.2rem",
          color: "#fff",
          marginTop: pkg.bonus > 0 ? 0 : "0.5rem",
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
