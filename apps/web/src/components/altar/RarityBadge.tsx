import type { Rareza } from "../../../../../packages/shared/src/types"
import { RARITY_CONFIG } from "../../config/rarityConfig"

interface RarityBadgeProps {
  rareza: Rareza
  size?: "sm" | "md" | "lg"
}

export function RarityBadge({ rareza, size = "md" }: RarityBadgeProps) {
  const cfg = RARITY_CONFIG[rareza]
  const fontSize = size === "sm" ? "0.7rem" : size === "lg" ? "1rem" : "0.85rem"

  return (
    <span
      style={{
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize,
        color: `var(${cfg.cssVar})`,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  )
}
