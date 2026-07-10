import type { Db } from "mongodb"
import type { Context } from "hono"
import {
  usersCol,
  userEntitiesCol,
  entitiesCol,
  marketListingsCol,
  ObjectId,
} from "../db/collections"
import { logAudit } from "./audit"
import { createNotification } from "./notifications"
import { recordShardTransaction } from "./transactions"

const NON_BAZAAR = ["dust", "nebula"]
const DEFAULT_LISTING_LIMIT = 20 // P-39

export class MarketError extends Error {
  status: number
  extra?: Record<string, unknown>
  constructor(message: string, status: number, extra?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

export interface BuyListingResult {
  message: string
  newShards: number
}

/**
 * Publica una entidad propia en el Hollow Bazaar (P-15 REST / P-24 MCP):
 * valida límite de listings activos, propiedad, rareza vendible y duplicados.
 * Compartido entre POST /market/sell y la tool MCP sell_bazaar_listing.
 */
export async function createListing(
  db: Db,
  clerkId: string,
  userEntityId: string,
  priceShards: number,
  c: Context | null
): Promise<{ listingId: string; message: string }> {
  if (priceShards < 1 || !Number.isInteger(priceShards)) {
    throw new MarketError("priceShards must be a positive integer", 400)
  }

  // P-39: límite de listings activos por usuario
  const sellerDoc = await usersCol(db).findOne({ clerkId }, { projection: { listingLimit: 1 } })
  const limit = sellerDoc?.listingLimit ?? DEFAULT_LISTING_LIMIT
  const activeCount = await marketListingsCol(db).countDocuments({
    sellerId: clerkId,
    status: "active",
  })
  if (activeCount >= limit) {
    throw new MarketError(
      `Active listing limit reached (${limit}). Cancel a listing before creating a new one.`,
      400
    )
  }

  const userEntity = await userEntitiesCol(db).findOne({
    _id: new ObjectId(userEntityId),
    ownerId: clerkId,
  })
  if (!userEntity) throw new MarketError("Entity not found or not owned by you", 404)

  const entityDoc = await entitiesCol(db).findOne({ _id: userEntity.entityId })
  if (!entityDoc) throw new MarketError("Entity data not found", 404)

  if (NON_BAZAAR.includes(entityDoc.rareza)) {
    throw new MarketError("Dust and Nebula entities cannot be listed on the Bazaar", 400)
  }

  const existingListing = await marketListingsCol(db).findOne({
    userEntityId: new ObjectId(userEntityId),
    status: "active",
  })
  if (existingListing) throw new MarketError("This entity is already listed", 409)

  const seller = await usersCol(db).findOne({ clerkId })
  if (!seller) throw new MarketError("User not found", 404)

  const inserted = await marketListingsCol(db).insertOne({
    sellerId: clerkId,
    sellerUsername: seller.username,
    userEntityId: new ObjectId(userEntityId),
    entitySnapshot: entityDoc,
    priceShards,
    status: "active",
    createdAt: new Date(),
  })

  await logAudit(db, c, {
    userId: clerkId,
    action: "market.listing.create",
    result: "success",
    details: { listingId: inserted.insertedId.toString(), entity: entityDoc.nombre, priceShards },
  })

  return { listingId: inserted.insertedId.toString(), message: "Listed successfully" }
}

/**
 * P-28: analíticas de precios del mercado — agregados de listings activos
 * por rareza + volumen de ventas de los últimos 7 días.
 */
export async function getMarketAnalytics(db: Db) {
  const [activeByRarity, soldLast7d] = await Promise.all([
    marketListingsCol(db)
      .aggregate<{
        _id: string
        count: number
        avgPrice: number
        minPrice: number
        maxPrice: number
      }>([
        { $match: { status: "active" } },
        {
          $group: {
            _id: "$entitySnapshot.rareza",
            count: { $sum: 1 },
            avgPrice: { $avg: "$priceShards" },
            minPrice: { $min: "$priceShards" },
            maxPrice: { $max: "$priceShards" },
          },
        },
        { $sort: { avgPrice: -1 } },
      ])
      .toArray(),
    marketListingsCol(db)
      .aggregate<{ count: number; volume: number }>([
        {
          $match: {
            status: "sold",
            soldAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        { $group: { _id: null, count: { $sum: 1 }, volume: { $sum: "$priceShards" } } },
      ])
      .toArray(),
  ])

  return {
    activeByRarity: activeByRarity.map((r) => ({
      rareza: r._id,
      listings: r.count,
      avgPrice: Math.round(r.avgPrice),
      minPrice: r.minPrice,
      maxPrice: r.maxPrice,
    })),
    soldLast7Days: soldLast7d[0] ?? { count: 0, volume: 0 },
  }
}

/**
 * Compra un listing activo del Hollow Bazaar: transfiere Shards (con tributo del
 * 5% para el vendedor), transfiere la entidad y registra transacciones/auditoría.
 * Usado tanto por la ruta REST POST /market/buy como por la tool MCP buy_bazaar_listing.
 */
export async function buyListing(
  db: Db,
  buyerClerkId: string,
  listingId: string,
  c: Context | null
): Promise<BuyListingResult> {
  const listings = marketListingsCol(db)
  const users = usersCol(db)
  const userEntities = userEntitiesCol(db)

  const listing = await listings.findOne({ _id: new ObjectId(listingId) })
  if (!listing) throw new MarketError("Listing not found", 404)
  if (listing.status !== "active") throw new MarketError("Listing is no longer available", 410)
  if (listing.sellerId === buyerClerkId) {
    throw new MarketError("Cannot buy your own listing", 400)
  }

  const buyer = await users.findOne({ clerkId: buyerClerkId })
  if (!buyer) throw new MarketError("Buyer not found", 404)
  if (buyer.shards < listing.priceShards) {
    throw new MarketError("Insufficient Shards", 402, {
      needed: listing.priceShards,
      have: buyer.shards,
    })
  }

  const claimed = await listings.findOneAndUpdate(
    { _id: new ObjectId(listingId), status: "active" },
    { $set: { status: "sold", soldAt: new Date() } },
    { returnDocument: "after" }
  )
  if (!claimed) throw new MarketError("Listing was already purchased", 410)

  await users.updateOne({ clerkId: buyerClerkId }, { $inc: { shards: -listing.priceShards } })

  const sellerReceives = Math.floor(listing.priceShards * 0.95)
  await users.updateOne({ clerkId: listing.sellerId }, { $inc: { shards: sellerReceives } })

  await userEntities.updateOne(
    { _id: listing.userEntityId },
    { $set: { ownerId: buyerClerkId, obtainedVia: "bazaar" } }
  )

  await users.updateOne({ clerkId: buyerClerkId }, { $push: { inventory: listing.userEntityId } })
  await users.updateOne(
    { clerkId: listing.sellerId },
    { $pull: { inventory: listing.userEntityId } } as any
  )

  const updatedBuyer = await users.findOne({ clerkId: buyerClerkId })
  const buyerBalance = updatedBuyer?.shards ?? buyer.shards - listing.priceShards

  await recordShardTransaction(db, {
    userId: buyerClerkId,
    type: "compra_bazaar",
    amount: -listing.priceShards,
    balanceAfter: buyerBalance,
    description: `Compra en Bazaar: ${listing.entitySnapshot?.nombre} (${listing.priceShards} Sh)`,
  })
  const sellerDoc = await users.findOne({ clerkId: listing.sellerId })
  await recordShardTransaction(db, {
    userId: listing.sellerId,
    type: "venta_bazaar",
    amount: sellerReceives,
    balanceAfter: sellerDoc?.shards ?? 0,
    description: `Venta en Bazaar: ${listing.entitySnapshot?.nombre} (recibido ${sellerReceives} Sh, tributo 5%)`,
  })

  await createNotification(db, {
    userId: listing.sellerId,
    type: "bazaar_sale",
    title: "¡Tu entidad se vendió!",
    message: `"${listing.entitySnapshot?.nombre}" se vendió por ${listing.priceShards} Shards. Recibiste ${sellerReceives} Shards (tributo del 5% aplicado).`,
  })

  await logAudit(db, c, {
    userId: buyerClerkId,
    action: "market.listing.buy",
    result: "success",
    details: {
      listingId,
      sellerId: listing.sellerId,
      entity: listing.entitySnapshot?.nombre,
      priceShards: listing.priceShards,
      sellerReceived: sellerReceives,
    },
  })

  return { message: "Purchase successful", newShards: buyerBalance }
}
