import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/vault")({ component: VaultPage })

const PACKAGES = [
  { id: "nebula_dust",       name: "Nebula Dust",     shards: 320,   bonus: 0,    price: "$4.99" },
  { id: "comet_shard",       name: "Comet Shard",     shards: 800,   bonus: 80,   price: "$9.99" },
  { id: "eclipse_cache",     name: "Eclipse Cache",   shards: 1600,  bonus: 400,  price: "$19.99" },
  { id: "singularity_core",  name: "Singularity Core", shards: 4000, bonus: 1600, price: "$49.99" },
] as const

function VaultPage() {
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
        The Aether Vault
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
        Acquire Shards to power your invocations. Secured by Stripe.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1.5rem",
          maxWidth: "960px",
        }}
      >
        {PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className="card"
            style={{
              border:
                pkg.id === "singularity_core"
                  ? "2px solid transparent"
                  : "1px solid var(--border-subtle)",
              background:
                pkg.id === "singularity_core"
                  ? "linear-gradient(var(--bg-elevated), var(--bg-elevated)) padding-box, linear-gradient(90deg,#ff0080,#ff8c00,#ffe100,#00ff88,#00cfff,#7b2fff,#ff0080) border-box"
                  : undefined,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.1rem",
                marginBottom: "0.75rem",
                color:
                  pkg.id === "singularity_core"
                    ? "var(--accent-aether)"
                    : "var(--text-primary)",
              }}
            >
              {pkg.name}
            </h2>

            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "1.4rem",
                color: "var(--accent-gold)",
                marginBottom: "0.25rem",
              }}
            >
              ◈ {pkg.shards.toLocaleString()}
            </p>

            {pkg.bonus > 0 && (
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.85rem",
                  color: "var(--rarity-nebula)",
                  marginBottom: "0.75rem",
                }}
              >
                + {pkg.bonus.toLocaleString()} bonus
              </p>
            )}

            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 600,
                fontSize: "1rem",
                color: "var(--text-secondary)",
                marginBottom: "1rem",
                marginTop: pkg.bonus > 0 ? 0 : "0.75rem",
              }}
            >
              {pkg.price}
            </p>

            <button className="btn-primary" style={{ width: "100%" }}>
              Adquirir
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
