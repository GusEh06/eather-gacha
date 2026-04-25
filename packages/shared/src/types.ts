// ─── Rareza ──────────────────────────────────────────────────────────────────

export type Rareza =
  | "dust"
  | "nebula"
  | "comet"
  | "nova"
  | "pulsar"
  | "eclipse"
  | "singularity"

// ─── Entity ──────────────────────────────────────────────────────────────────

export type Arquetipo = "Guerrero" | "Oráculo" | "Devorador" | "Guardián" | "Trickster"

export interface Entity {
  _id: string
  nombre: string
  rareza: Rareza
  epoca: string
  arquetipo: Arquetipo
  descripcionLore: string
  imageUrl: string
  descripcionOjos: string
  disponibleGacha: boolean
  disponibleRift: boolean
}

// ─── UserEntity (instancia del inventario) ───────────────────────────────────

export interface UserEntity {
  _id: string
  entityId: string
  ownerId: string         // clerkId del dueño actual
  obtainedAt: string      // ISO date string
  obtainedVia: "gacha" | "rift" | "bazaar"
  entity?: Entity         // populated on fetch
}

// ─── UserProfile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  _id: string
  clerkId: string
  username: string
  title: string            // always "Aether Binder"
  shards: number
  pityCounter: number
  pityMythicCounter: number
  inventory: string[]      // ObjectId refs to user_entities
  createdAt: string
}

// ─── MarketListing ───────────────────────────────────────────────────────────

export interface MarketListing {
  _id: string
  sellerId: string
  sellerUsername: string
  userEntityId: string
  entitySnapshot: Entity
  priceShards: number
  status: "active" | "sold" | "cancelled"
  createdAt: string
  soldAt?: string
}

// ─── RiftSlot ────────────────────────────────────────────────────────────────

export interface RiftSlot {
  entityId: string
  priceShards: number
  sold: boolean
  entity?: Entity          // populated on fetch
}

export interface RiftRotation {
  _id: string
  date: string             // "YYYY-MM-DD"
  slots: RiftSlot[]
  expiresAt: string
}

// ─── ShardPackage ────────────────────────────────────────────────────────────

export interface ShardPackage {
  id: "spark" | "astral" | "nova_surge" | "singularity_core"
  name: string
  priceUsd: number
  shardsBase: number
  shardsBonus: number
  shardsTotal: number
}

export const SHARD_PACKAGES: ShardPackage[] = [
  {
    id: "spark",
    name: "Spark of Aether",
    priceUsd: 1.99,
    shardsBase: 100,
    shardsBonus: 0,
    shardsTotal: 100,
  },
  {
    id: "astral",
    name: "Astral Fragment",
    priceUsd: 4.99,
    shardsBase: 300,
    shardsBonus: 50,
    shardsTotal: 350,
  },
  {
    id: "nova_surge",
    name: "Nova Surge",
    priceUsd: 9.99,
    shardsBase: 700,
    shardsBonus: 150,
    shardsTotal: 850,
  },
  {
    id: "singularity_core",
    name: "Singularity Core",
    priceUsd: 19.99,
    shardsBase: 1600,
    shardsBonus: 400,
    shardsTotal: 2000,
  },
]

// ─── Invocation cost constants ────────────────────────────────────────────────

export const INVOKE_COST_X1 = 160
export const INVOKE_COST_X10 = 1600
export const ONBOARDING_SHARDS = 320
export const BAZAAR_TRIBUTE_PCT = 0.05

// ─── Rarity probabilities ────────────────────────────────────────────────────

export const RARITY_BASE_PROB: Record<Rareza, number> = {
  dust: 0.58,
  nebula: 0.25,
  comet: 0.10,
  nova: 0.04,
  pulsar: 0.029,
  eclipse: 0.0009,
  singularity: 0.0001,
}

export const RIFT_PRICES: Partial<Record<Rareza, number>> = {
  comet: 200,
  nova: 500,
  pulsar: 1200,
  eclipse: 4000,
  singularity: 8000,
}
