import { motion } from "framer-motion"
import type { RiftSlotData } from "../../hooks/useRift"
import { RARITY_CONFIG } from "../../config/rarityConfig"
import { RarityBadge } from "../altar/RarityBadge"

interface Props {
  slot: RiftSlotData
  index: number
  onBuy: (index: number) => void
  isLoading?: boolean
}

export function RiftSlot({ slot, index, onBuy, isLoading }: Props) {
  const rarity = (slot.entity?.rareza ?? "dust") as keyof typeof RARITY_CONFIG
  const config = RARITY_CONFIG[rarity]

  return (
    // Outer motion.div handles the portal-arrival entrance (spring stagger by index)
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay: index * 0.08,
      }}
    >
      {/* Inner div handles sold-dimming via CSS transition — no Framer Motion conflict */}
      <div
        className="card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          alignItems: "center",
          borderColor: config ? `var(${config.cssVar})` : "var(--border-subtle)",
          opacity: slot.sold ? 0.5 : 1,
          transition: "opacity 0.3s ease",
          height: "100%",
        }}
      >
        {/* Entity image */}
        <div
          className={slot.sold ? undefined : "entity-idle"}
          style={{
            width: "100%",
            height: "130px",
            overflow: "hidden",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "--rarity-color": config?.color,
            filter: slot.sold ? "grayscale(1) brightness(0.5)" : undefined,
          } as React.CSSProperties}
        >
          {slot.entity?.imageUrl ? (
            <img
              src={slot.entity.imageUrl}
              alt={slot.entity.nombre ?? "Entity"}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                padding: "0.5rem",
                filter: slot.sold ? undefined : `drop-shadow(0 2px 8px ${config?.color}66)`,
              }}
            />
          ) : (
            <span style={{ fontSize: "2.5rem", color: config?.color }}>{config?.icon ?? "◈"}</span>
          )}
        </div>

        {/* Entity name */}
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.9rem",
            textAlign: "center",
            color: slot.sold ? "var(--text-muted)" : "var(--text-primary)",
            letterSpacing: "0.06em",
          }}
        >
          {slot.entity?.nombre ?? "Unknown"}
        </p>

        {/* Rarity badge */}
        <RarityBadge rareza={rarity} />

        {/* Price */}
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontWeight: 600,
            fontSize: "1rem",
            color: slot.sold ? "var(--text-muted)" : "var(--accent-gold)",
          }}
        >
          ◈ {slot.priceShards.toLocaleString("en-US")}
        </p>

        {/* Buy / Claimed */}
        {slot.sold ? (
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontWeight: 600,
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "4px",
              padding: "0.4rem 1rem",
              width: "100%",
              textAlign: "center",
            }}
          >
            Claimed
          </div>
        ) : (
          <button
            className="btn-primary"
            style={{
              width: "100%",
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
            onClick={() => onBuy(index)}
            disabled={isLoading}
          >
            {isLoading ? "Buying…" : "Buy"}
          </button>
        )}
      </div>
    </motion.div>
  )
}
