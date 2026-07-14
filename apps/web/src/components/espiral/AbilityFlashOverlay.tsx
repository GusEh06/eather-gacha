import { AnimatePresence, motion } from "framer-motion"
import {
  ESPIRAL_ABILITIES,
  type EspiralAbilityId,
} from "../../../../../packages/shared/src/espiral"

export interface AbilityFlash {
  id: number
  ability: EspiralAbilityId
  sourceName: string
  color: string
  /** true para eclipse/singularity — tratamiento full-screen "regla rota". */
  broken: boolean
}

/**
 * Overlay de habilidad: para habilidades "rotas" (Eclipse/Singularity) hace
 * flash de pantalla completa + nombre gigante + ondas expansivas — el momento
 * exacto donde la rareza PEGA visualmente. Para el resto, un banner breve.
 */
export function AbilityFlashOverlay({ flash }: { flash: AbilityFlash | null }) {
  return (
    <AnimatePresence>
      {flash && flash.broken && (
        <motion.div
          key={flash.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          {/* Flash blanco → color de rareza */}
          <motion.div
            initial={{ opacity: 0.9, background: "#fff" }}
            animate={{ opacity: 0, background: flash.color }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{ position: "absolute", inset: 0 }}
          />
          {/* Ondas expansivas */}
          {[0, 0.12, 0.24].map((delay) => (
            <motion.div
              key={delay}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 3.2, opacity: 0 }}
              transition={{ duration: 1.1, delay, ease: "easeOut" }}
              style={{
                position: "absolute",
                width: "40vmin",
                height: "40vmin",
                borderRadius: "50%",
                border: `3px solid ${flash.color}`,
                boxShadow: `0 0 40px ${flash.color}aa, inset 0 0 40px ${flash.color}55`,
              }}
            />
          ))}
          {/* Nombre de la habilidad — zoom dramático */}
          <motion.div
            initial={{ scale: 2.4, opacity: 0, filter: "blur(12px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            style={{ textAlign: "center", position: "relative" }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.8rem, 5vw, 3.4rem)",
                fontWeight: 900,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#fff",
                textShadow: `0 0 40px ${flash.color}, 0 0 90px ${flash.color}`,
              }}
            >
              {ESPIRAL_ABILITIES[flash.ability].nombre}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "0.9rem",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: flash.color,
                marginTop: "0.5rem",
              }}
            >
              {flash.sourceName} rompe las reglas
            </div>
          </motion.div>
        </motion.div>
      )}

      {flash && !flash.broken && (
        <motion.div
          key={flash.id}
          initial={{ opacity: 0, y: -16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          style={{
            position: "absolute",
            top: "12%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 40,
            pointerEvents: "none",
            background: `${flash.color}20`,
            border: `1px solid ${flash.color}88`,
            borderRadius: "999px",
            padding: "0.4rem 1.4rem",
            backdropFilter: "blur(8px)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: "0.85rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: flash.color,
            whiteSpace: "nowrap",
          }}
        >
          ✦ {ESPIRAL_ABILITIES[flash.ability].nombre} — {flash.sourceName}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
