import type { Rareza } from "../../../packages/shared/src/types"

export interface RarityConfig {
  label: string
  /** CSS variable name, e.g. "--rarity-nova" */
  cssVar: string
  /** Resolved hex color — kept in sync with styles.css :root vars */
  color: string
  /** Number of eye-pairs shown during the "eyes" phase */
  eyePairs: number
  /** Unicode arquetipo symbol displayed as the entity placeholder icon */
  icon: string
  /** True only for Singularity — triggers iridescent gradient treatment */
  isSingularity?: boolean
}

export const RARITY_CONFIG: Record<Rareza, RarityConfig> = {
  dust: {
    label: "Dust",
    cssVar: "--rarity-dust",
    color: "#8a8a8a",
    eyePairs: 1,
    icon: "∘",
  },
  nebula: {
    label: "Nebula",
    cssVar: "--rarity-nebula",
    color: "#4caf50",
    eyePairs: 1,
    icon: "◎",
  },
  comet: {
    label: "Comet",
    cssVar: "--rarity-comet",
    color: "#2196f3",
    eyePairs: 2,
    icon: "✦",
  },
  nova: {
    label: "Nova",
    cssVar: "--rarity-nova",
    color: "#9c27b0",
    eyePairs: 2,
    icon: "✸",
  },
  pulsar: {
    label: "Pulsar",
    cssVar: "--rarity-pulsar",
    color: "#f0a500",
    eyePairs: 3,
    icon: "⊛",
  },
  eclipse: {
    label: "Eclipse",
    cssVar: "--rarity-eclipse",
    color: "#c0392b",
    eyePairs: 4,
    icon: "⬤",
  },
  singularity: {
    label: "Singularity",
    cssVar: "--rarity-singularity",
    color: "#7b2fff",
    eyePairs: 5,
    icon: "ᛟ",
    isSingularity: true,
  },
}

/** Rarities that CANNOT be listed on the Bazaar (per PRD rule) */
export const NON_BAZAAR_RARITIES: Rareza[] = ["dust", "nebula"]
