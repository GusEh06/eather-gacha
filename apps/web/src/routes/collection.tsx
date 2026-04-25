import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/collection")({ component: CollectionPage })

function CollectionPage() {
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
        Collection
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
        Your bound entities, Aether Binder.
      </p>

      {/* Empty state */}
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
        <p>No entities yet. Visit The Altar to begin your collection.</p>
      </div>
    </div>
  )
}
