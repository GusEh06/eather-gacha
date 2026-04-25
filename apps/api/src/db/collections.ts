import { type Collection, type Db, ObjectId } from "mongodb"

// Re-export ObjectId for convenience
export { ObjectId }

// ─── MongoDB document types (use ObjectId instead of string) ─────────────────

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
  status: "active" | "sold" | "cancelled"
  createdAt: Date
  soldAt?: Date
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
