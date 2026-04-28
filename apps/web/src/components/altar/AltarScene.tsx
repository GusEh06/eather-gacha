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
    <div style={{ textAlign: "center", padding: "1rem", zIndex: 10, marginTop: "-120px" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "4.5rem",
          color: "#00ffff",
          textShadow: "3px 3px 0 #ff3399",
          letterSpacing: "0.05em",
          marginBottom: "0.5rem",
          fontWeight: 900,
          textTransform: "uppercase"
        }}
      >
        Ritual
      </h1>
      <div
        style={{
          display: "inline-block",
          background: "#ccff00",
          color: "#000",
          padding: "5px 15px",
          fontFamily: "var(--font-display)",
          fontSize: "1.1rem",
          fontWeight: 900,
          border: "3px solid #000",
          boxShadow: "4px 4px 0 #000",
          marginBottom: "4rem",
          textTransform: "uppercase"
        }}
      >
        Elige tu Aliado
      </div>

      {/* Esfera de Poder (Brutalist Comic Style con Vortex) */}
      <div style={{ position: "relative", width: "260px", height: "260px", margin: "0 auto 4rem" }}>
        
        {/* Rayos de energía Vortex (Cyan) */}
        <motion.div
          animate={{ rotate: 360, scale: isLoading ? [1, 1.2, 1] : 1 }}
          transition={{ rotate: { duration: 12, repeat: Infinity, ease: "linear" }, scale: { duration: 0.5, repeat: Infinity } }}
          style={{
            position: "absolute", inset: -80,
            background: "repeating-conic-gradient(from 0deg, #00ffff 0deg 8deg, transparent 8deg 40deg)",
            clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
            zIndex: 1,
            opacity: isLoading ? 1 : 0.5
          }}
        />

        {/* Rayos de energía Vortex (Magenta) */}
        <motion.div
          animate={{ rotate: -360, scale: isLoading ? [1, 1.3, 1] : 1 }}
          transition={{ rotate: { duration: 8, repeat: Infinity, ease: "linear" }, scale: { duration: 0.4, repeat: Infinity } }}
          style={{
            position: "absolute", inset: -100,
            background: "repeating-conic-gradient(from 15deg, #ff3399 0deg 5deg, transparent 5deg 60deg)",
            clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            zIndex: 1,
            opacity: isLoading ? 0.8 : 0.3
          }}
        />

        {/* Anillo exterior mecánico */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", inset: -15, borderRadius: "50%",
            border: "8px dashed #000",
            boxShadow: "4px 4px 0 #000"
          }}
        />

        {/* Orbe Central (Sólido y rudo) */}
        <motion.div
          animate={{
            scale: isLoading ? [1, 1.1, 1] : [1, 1.05, 1],
            boxShadow: isLoading 
              ? ["12px 12px 0 #000", "16px 16px 0 #000", "12px 12px 0 #000"]
              : ["12px 12px 0 #000", "12px 12px 0 #000", "12px 12px 0 #000"]
          }}
          transition={{ duration: isLoading ? 0.3 : 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: "#ff3399",
            border: "8px solid #000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 5,
            overflow: "hidden"
          }}
        >
          {/* Ojo interno o pupila (Cyan sólido) */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              width: "60%", height: "60%",
              borderRadius: "50%",
              background: "#00ffff",
              border: "6px solid #000",
            }}
          />

          {/* Runic Detail Ring */}
          <motion.svg
            animate={{ rotate: -360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            style={{ position: "absolute", width: "100%", height: "100%", zIndex: 6, pointerEvents: "none" }}
            viewBox="0 0 260 260"
          >
            <path id="rune-path" d="M 130, 130 m -85, 0 a 85,85 0 1,1 170,0 a 85,85 0 1,1 -170,0" fill="transparent" />
            <text fill="#000" fontSize="16" fontWeight="900" style={{ fontFamily: "var(--font-display)" }}>
              <textPath href="#rune-path" startOffset="0%">
                ᚠ ᚢ ᚦ ᚬ ᚱ ᚴ ᚼ ᚾ ᛁ ᛅ ᛋ ᛏ ᛒ ᛘ ᛚ ᛦ ᚠ ᚢ ᚦ ᚬ ᚱ ᚴ ᚼ ᚾ ᛁ ᛅ ᛋ ᛏ ᛒ ᛘ ᛚ ᛦ ᚠ ᚢ ᚦ ᚬ ᚱ ᚴ ᚼ ᚾ ᛁ ᛅ ᛋ ᛏ ᛒ ᛘ ᛚ ᛦ
              </textPath>
            </text>
          </motion.svg>
          <span style={{ 
            position: "relative", zIndex: 10, fontSize: "5.5rem", 
            color: "#fff", textShadow: "4px 4px 0 #000",
            WebkitTextStroke: "2px #000"
          }}>
            {isLoading ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{ display: "inline-block" }}
              >
                ᛟ
              </motion.span>
            ) : (
              "ᛟ"
            )}
          </span>
        </motion.div>
      </div>

      {/* Botones de Invocación estilo Gacha Premium */}
      <div
        style={{
          display: "flex",
          gap: "2rem",
          justifyContent: "center",
          flexWrap: "wrap",
          paddingTop: "1rem"
        }}
      >
        <button
          className="aether-cta"
          style={{
            opacity: canX1 ? 1 : 0.4,
            cursor: canX1 ? "pointer" : "not-allowed",
          }}
          disabled={!canX1}
          onClick={() => onInvoke("x1")}
        >
          Invocar x1 &nbsp;◈ 160
        </button>

        <button
          className="aether-cta aether-cta--gold"
          style={{
            opacity: canX10 ? 1 : 0.4,
            cursor: canX10 ? "pointer" : "not-allowed",
          }}
          disabled={!canX10}
          onClick={() => onInvoke("x10")}
        >
          Invocar x10 &nbsp;◈ 1,600
        </button>
      </div>

      <div
        style={{
          position: "fixed",
          top: "100px",
          right: "40px",
          background: "#000",
          color: "#fff",
          padding: "10px 20px",
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: "1.2rem",
          letterSpacing: "0.1em",
          border: "4px solid #ccff00",
          boxShadow: "6px 6px 0 #000",
          zIndex: 50
        }}
      >
        Saldo: ◈ {shards.toLocaleString()}
      </div>
    </div>
  )
}
