import { type Collection, type Db, ObjectId } from "mongodb"
import type { EspiralCombatSession } from "../../../../packages/shared/src/espiral"

// Re-export ObjectId for convenience
export { ObjectId }

// ─── MongoDB document types (use ObjectId instead of string) ─────────────────

export type UserRole = "binder" | "moderator" | "admin"

export interface UserDoc {
  _id?: ObjectId
  clerkId: string
  username: string
  title: string
  shards: number
  pityCounter: number
  pityMythicCounter: number
  inventory: ObjectId[]
  createdAt: Date
  // P-18: sistema de roles (binder es implícito si el array falta)
  roles?: UserRole[]
  // P-05: suspensión temporal
  suspendedUntil?: Date | null
  suspensionReason?: string | null
  suspendedBy?: string | null
  // P-39: límite de listings activos (default 20, ajustable por admin)
  listingLimit?: number
  // La Espiral: moneda blanda, energía y pity del Altar del Eco
  ecos?: number
  energyCurrent?: number
  energyLastRegenAt?: Date
  espiralPityCounter?: number
}

export interface EntityDoc {
  _id?: ObjectId
  nombre: string
  rareza: string
  epoca: string
  arquetipo: string
  descripcionLore: string
  imageUrl: string
  descripcionOjos: string
  disponibleGacha: boolean
  disponibleRift: boolean
  // La Espiral: pool del Altar del Eco + overrides opcionales de admin
  disponibleAltarEco?: boolean
  statsOverride?: { hp?: number; atk?: number; def?: number; vel?: number } | null
  espiralAbilityOverride?: string | null
}

export interface UserEntityDoc {
  _id?: ObjectId
  entityId: ObjectId
  ownerId: string          // clerkId
  obtainedAt: Date
  obtainedVia: "gacha" | "rift" | "bazaar"
}

export interface MarketListingDoc {
  _id?: ObjectId
  sellerId: string
  sellerUsername: string
  userEntityId: ObjectId
  entitySnapshot: EntityDoc
  priceShards: number
  status: "active" | "sold" | "cancelled" | "cancelled_by_mod"
  createdAt: Date
  soldAt?: Date
  // P-19: moderación
  cancelledAt?: Date
  cancelledBy?: string
  cancelReason?: string
}

// P-04: log de auditoría de acciones críticas (append-only)
export interface AuditLogDoc {
  _id?: ObjectId
  timestamp: Date
  requestId?: string
  userId: string
  ip?: string
  action: string
  result: "success" | "failure"
  details?: Record<string, unknown>
}

// P-38: notificaciones in-app
export interface NotificationDoc {
  _id?: ObjectId
  userId: string           // clerkId del destinatario
  type: "bazaar_sale" | "listing_cancelled" | "rift_rotation" | "system"
  title: string
  message: string
  read: boolean
  createdAt: Date
}

// P-40: historial de movimientos de Shards
export interface ShardTransactionDoc {
  _id?: ObjectId
  userId: string           // clerkId
  type: "invocacion" | "compra_rift" | "compra_bazaar" | "venta_bazaar" | "recarga" | "ajuste_admin"
  amount: number           // negativo = gasto, positivo = ingreso
  balanceAfter: number
  description: string
  createdAt: Date
}

// La Espiral: progreso por usuario — un solo doc por userId (índice único),
// checkpoint + run activo embebido para evitar runs "activos" huérfanos.
export interface EspiralProgressDoc {
  _id?: ObjectId
  userId: string // clerkId, único
  checkpointFloor: number
  bestFloorEver: number
  activeRun: {
    teamUserEntityIds: ObjectId[]
    currentFloor: number
    seed: string
    status: "active" | "dead"
    deadAt?: Date // inicio de la ventana de revive (15 min)
    startedAt: Date
    ecosEarned: number
    /** Combate manual a mitad de resolución (null/ausente si no hay ninguno). */
    combat?: EspiralCombatSession | null
  } | null
  updatedAt: Date
}

// La Espiral: historial de Ecos del Vacío — paralela a ShardTransactionDoc
// (colección propia para no ensuciar la union de types de Shards).
export interface EcosTransactionDoc {
  _id?: ObjectId
  userId: string // clerkId
  type: "espiral_drop" | "boss_drop" | "mission" | "altar_pull" | "revive" | "ajuste_admin"
  amount: number // negativo = gasto, positivo = ingreso
  balanceAfter: number
  description: string
  createdAt: Date
}

// La Espiral: progreso de misiones por usuario/periodo — reset perezoso por
// periodKey ("2026-07-11" diario, "2026-W28" semanal), sin cron.
export interface EspiralMissionProgressDoc {
  _id?: ObjectId
  userId: string // clerkId
  periodKey: string
  metrics: {
    floors_cleared: number
    max_floor_reached: number
    bosses_defeated: number
  }
  claimedMissionIds: string[]
  updatedAt: Date
}

export interface RiftRotationDoc {
  _id?: ObjectId
  date: string
  slots: Array<{
    entityId: ObjectId
    priceShards: number
    sold: boolean
  }>
  expiresAt: Date
}

// MCP: API key personal del Aether Binder para autenticar al servidor MCP.
// Se guarda solo el hash (sha256); la key en texto plano se muestra una sola vez.
export interface ApiKeyDoc {
  _id?: ObjectId
  userId: string // clerkId
  keyHash: string
  label: string
  createdAt: Date
  lastUsedAt?: Date
}

// ─── Typed collection accessors ───────────────────────────────────────────────

export function usersCol(db: Db): Collection<UserDoc> {
  return db.collection<UserDoc>("users")
}

export function entitiesCol(db: Db): Collection<EntityDoc> {
  return db.collection<EntityDoc>("entities")
}

export function userEntitiesCol(db: Db): Collection<UserEntityDoc> {
  return db.collection<UserEntityDoc>("user_entities")
}

export function marketListingsCol(db: Db): Collection<MarketListingDoc> {
  return db.collection<MarketListingDoc>("market_listings")
}

export function riftRotationCol(db: Db): Collection<RiftRotationDoc> {
  return db.collection<RiftRotationDoc>("rift_rotation")
}

export function auditLogsCol(db: Db): Collection<AuditLogDoc> {
  return db.collection<AuditLogDoc>("audit_logs")
}

export function notificationsCol(db: Db): Collection<NotificationDoc> {
  return db.collection<NotificationDoc>("notifications")
}

export function shardTransactionsCol(db: Db): Collection<ShardTransactionDoc> {
  return db.collection<ShardTransactionDoc>("shard_transactions")
}

export function apiKeysCol(db: Db): Collection<ApiKeyDoc> {
  return db.collection<ApiKeyDoc>("api_keys")
}

export function espiralProgressCol(db: Db): Collection<EspiralProgressDoc> {
  return db.collection<EspiralProgressDoc>("espiral_progress")
}

export function ecosTransactionsCol(db: Db): Collection<EcosTransactionDoc> {
  return db.collection<EcosTransactionDoc>("ecos_transactions")
}

export function espiralMissionProgressCol(db: Db): Collection<EspiralMissionProgressDoc> {
  return db.collection<EspiralMissionProgressDoc>("espiral_mission_progress")
}
