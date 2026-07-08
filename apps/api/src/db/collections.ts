import { type Collection, type Db, ObjectId } from "mongodb"

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
