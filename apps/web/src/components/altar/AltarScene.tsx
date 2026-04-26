import { motion } from "framer-motion"

interface AltarSceneProps {
  shards: number
  onInvoke: (mode: "x1" | "x10") => void
  isLoading: boolean
}

export function AltarScene({ shards, onInvoke, isLoading }: AltarSceneProps) {
  const canX1 = !isLoading && shards >= 160
  const canX10 = !isLoading && shards >= 1600

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "2.5rem",
          color: "var(--accent-aether)",
          letterSpacing: "0.12em",
          marginBottom: "0.5rem",
        }}
      >
        The Altar
      </h1>
      <p
        style={{
          color: "var(--text-secondary)",
          fontFamily: "var(--font-ui)",
          marginBottom: "2.5rem",
        }}
      >
        The ritual awaits. Summon entities from the void.
      </p>

      {/* Altar orb */}
      <motion.div
        animate={{
          boxShadow: isLoading
            ? [
                "0 0 24px var(--accent-aether), 0 0 48px rgba(123,47,255,0.6)",
                "0 0 40px var(--accent-aether), 0 0 80px rgba(123,47,255,0.8)",
                "0 0 24px var(--accent-aether), 0 0 48px rgba(123,47,255,0.6)",
              ]
            : [
                "0 0 8px var(--accent-aether), 0 0 16px rgba(123,47,255,0.3)",
                "0 0 16px var(--accent-aether), 0 0 32px rgba(123,47,255,0.5)",
                "0 0 8px var(--accent-aether), 0 0 16px rgba(123,47,255,0.3)",
              ],
        }}
        transition={{ duration: isLoading ? 0.6 : 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: "200px",
          height: "200px",
          margin: "0 auto 2.5rem",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(123,47,255,0.35) 0%, rgba(10,10,15,0) 70%)",
          border: "1px solid var(--border-active)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "3.5rem",
        }}
      >
        {isLoading ? (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            ᛟ
          </motion.span>
        ) : (
          "ᛟ"
        )}
      </motion.div>

      {/* Invoke buttons */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          className="btn-primary"
          style={{
            fontSize: "1rem",
            padding: "0.75rem 2rem",
            opacity: canX1 ? 1 : 0.4,
            cursor: canX1 ? "pointer" : "not-allowed",
          }}
          disabled={!canX1}
          onClick={() => onInvoke("x1")}
        >
          Invocar x1 &nbsp;◈ 160
        </button>

        <button
          className="btn-primary"
          style={{
            fontSize: "1rem",
            padding: "0.75rem 2rem",
            background: canX10 ? "var(--accent-gold)" : undefined,
            opacity: canX10 ? 1 : 0.4,
            cursor: canX10 ? "pointer" : "not-allowed",
          }}
          disabled={!canX10}
          onClick={() => onInvoke("x10")}
        >
          Invocar x10 &nbsp;◈ 1,600
        </button>
      </div>

      <p
        style={{
          color: "var(--text-muted)",
          fontFamily: "var(--font-ui)",
          fontSize: "0.8rem",
          marginTop: "1.5rem",
        }}
      >
        Balance: ◈ {shards.toLocaleString()}
      </p>
    </div>
  )
}
