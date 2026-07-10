import type { Db } from "mongodb"
import type { Context } from "hono"
import { usersCol, userEntitiesCol, marketListingsCol, ObjectId } from "../db/collections"
import { logAudit } from "./audit"
import { createNotification } from "./notifications"
import { recordShardTransaction } from "./transactions"

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
