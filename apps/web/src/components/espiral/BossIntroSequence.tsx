import { motion } from "framer-motion"

/**
 * Intro de jefe — cortina de pantalla completa: franjas rojas que se cierran,
 * nombre del jefe con zoom brutal y aviso de piso. Dura ~2.2s y se desmonta.
 */
export function BossIntroSequence({ bossName, floor }: { bossName: string; floor: number }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Franjas superior/inferior estilo cinemática */}
      <motion.div
        initial={{ y: "-100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "18%",
          background: "linear-gradient(180deg, #000 60%, transparent)",
          borderBottom: "1px solid #c0392b55",
        }}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "18%",
          background: "linear-gradient(0deg, #000 60%, transparent)",
          borderTop: "1px solid #c0392b55",
        }}
      />

      {/* Pulso rojo de amenaza */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.35, 0.15, 0.3, 0.1] }}
        transition={{ duration: 2, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, #c0392b44 0%, transparent 70%)",
        }}
      />

      <div style={{ textAlign: "center", position: "relative" }}>
        <motion.div
          initial={{ opacity: 0, letterSpacing: "1.2em" }}
          animate={{ opacity: 1, letterSpacing: "0.5em" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.85rem",
            textTransform: "uppercase",
            color: "#c0392b",
            marginBottom: "0.75rem",
          }}
        >
          ⚠ Guardián del piso {floor} ⚠
        </motion.div>
        <motion.h2
          initial={{ scale: 3, opacity: 0, filter: "blur(16px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 160, damping: 20, delay: 0.35 }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 6vw, 4rem)",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "#fff",
            textShadow: "0 0 40px #c0392b, 0 0 100px #c0392b88",
            margin: 0,
          }}
        >
          {bossName}
        </motion.h2>
      </div>
    </motion.div>
  )
}
