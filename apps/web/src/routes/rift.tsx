import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/rift")({ component: RiftPage })

function RiftPage() {
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
        The Rift
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
        Entities drift through the rift for a limited time. Buy directly with Shards.
      </p>
      <p
        style={{
          color: "var(--accent-gold)",
          fontFamily: "var(--font-display)",
          fontSize: "1.4rem",
          marginBottom: "2rem",
          letterSpacing: "0.06em",
        }}
      >
        Closes in: --:--:--
      </p>

      {/* Rift slots placeholder */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1.5rem",
          maxWidth: "720px",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="card"
            style={{
              minHeight: "240px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
              borderColor: "var(--border-subtle)",
            }}
          >
            — slot {i + 1} —
          </div>
        ))}
      </div>
    </div>
  )
}
