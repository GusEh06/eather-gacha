import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({ component: AltarPage })

function AltarPage() {
  return (
    <div
      className="page"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 60px)",
        background: "var(--bg-void)",
      }}
    >
      {/* Altar placeholder */}
      <div
        style={{
          textAlign: "center",
          maxWidth: "480px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2.5rem",
            color: "var(--accent-aether)",
            letterSpacing: "0.12em",
            marginBottom: "1rem",
          }}
        >
          The Altar
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-ui)",
            marginBottom: "2rem",
          }}
        >
          The ritual awaits. Summon the entities from the void.
        </p>

        {/* Altar visual placeholder */}
        <div
          style={{
            width: "200px",
            height: "200px",
            margin: "0 auto 2rem",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(123,47,255,0.3) 0%, rgba(10,10,15,0) 70%)",
            border: "1px solid var(--border-active)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "3rem",
            animation: "aetherPulse 2s ease-in-out infinite",
          }}
        >
          ᛟ
        </div>

        <button className="btn-primary" style={{ fontSize: "1rem", padding: "0.75rem 2rem" }}>
          Invocar ◈ 160
        </button>
      </div>
    </div>
  )
}
