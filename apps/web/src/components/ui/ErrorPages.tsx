import { Link } from "@tanstack/react-router"

const shellStyle: React.CSSProperties = {
  minHeight: "70vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "1rem",
  textAlign: "center",
  padding: "2rem",
}

const linkStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: "1rem",
  padding: "0.75rem 1.75rem",
  background: "var(--accent-aether, #00ffff)",
  color: "#000",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  textDecoration: "none",
  border: "3px solid #000",
  boxShadow: "4px 4px 0 #000",
}

/** P-09: página 404 temática */
export function NotFoundPage() {
  return (
    <div style={shellStyle}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(3rem, 10vw, 6rem)",
          color: "var(--accent-aether, #00ffff)",
          margin: 0,
          textShadow: "3px 3px 0 #ff3399",
        }}
      >
        404
      </h1>
      <h2 style={{ fontFamily: "var(--font-display)", color: "var(--text-primary, #e8e8f0)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
        Perdido en el Vacío
      </h2>
      <p style={{ color: "var(--text-secondary, #a0a0b0)", maxWidth: "420px", lineHeight: 1.6 }}>
        Esta región del Aether no existe — o fue consumida por una Singularity.
        Ninguna entidad responde a tu invocación aquí.
      </p>
      <Link to="/" style={linkStyle}>
        Volver al Altar
      </Link>
    </div>
  )
}

/** P-09: error boundary — errores no manejados del árbol de componentes */
export function ErrorPage({ error }: { error: Error }) {
  return (
    <div style={shellStyle}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2rem, 7vw, 4rem)",
          color: "#ff3399",
          margin: 0,
          textShadow: "3px 3px 0 #000",
        }}
      >
        Fractura en el Aether
      </h1>
      <p style={{ color: "var(--text-secondary, #a0a0b0)", maxWidth: "440px", lineHeight: 1.6 }}>
        Algo colapsó inesperadamente. El incidente fue contenido — tus Shards y
        tu colección están a salvo. Intenta recargar o vuelve al Altar.
      </p>
      {import.meta.env.DEV && (
        <pre
          style={{
            maxWidth: "min(640px, 90vw)",
            overflow: "auto",
            background: "rgba(255, 51, 153, 0.08)",
            border: "1px solid #ff3399",
            padding: "1rem",
            fontSize: "0.75rem",
            color: "#ff8fc4",
            textAlign: "left",
          }}
        >
          {error.message}
        </pre>
      )}
      <div style={{ display: "flex", gap: "1rem" }}>
        <button onClick={() => window.location.reload()} style={{ ...linkStyle, cursor: "pointer" }}>
          Recargar
        </button>
        <a href="/" style={{ ...linkStyle, background: "transparent", color: "var(--accent-aether, #00ffff)", borderColor: "var(--accent-aether, #00ffff)", boxShadow: "4px 4px 0 var(--accent-aether, #00ffff)" }}>
          Ir al Altar
        </a>
      </div>
    </div>
  )
}
