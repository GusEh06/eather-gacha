import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/bazaar")({ component: BazaarPage })

function BazaarPage() {
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
        The Hollow Bazaar
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
        Trade entities with other Aether Binders. All transactions in Shards.
      </p>

      {/* Listings grid placeholder */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="card"
            style={{
              borderColor: "var(--border-subtle)",
              minHeight: "280px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
            }}
          >
            — listing —
          </div>
        ))}
      </div>
    </div>
  )
}
