import { Hono } from "hono"
import { authMiddleware } from "../middleware/auth"
import { getDb } from "../db/client"
import {
  usersCol,
  userEntitiesCol,
  entitiesCol,
  marketListingsCol,
  ObjectId,
} from "../db/collections"
import { logAudit } from "../services/audit"
import { createNotification } from "../services/notifications"
import { recordShardTransaction } from "../services/transactions"

const marketRoutes = new Hono()

const NON_BAZAAR = ["dust", "nebula"]
const DEFAULT_LISTING_LIMIT = 20 // P-39

// ── GET /market/list ──────────────────────────────────────────────────────────
// Public — no auth required
marketRoutes.get("/list", async (c) => {
  const rarityFilter = c.req.query("rarity")
  const sort = c.req.query("sort") ?? "newest"

  try {
    const db = await getDb()
    const listings = marketListingsCol(db)

    const filter: Record<string, unknown> = { status: "active" }
    if (rarityFilter) {
      filter["entitySnapshot.rareza"] = rarityFilter
    }

    const sortOrder: import("mongodb").Sort =
      sort === "price_asc"
        ? { priceShards: 1 as const }
        : sort === "price_desc"
          ? { priceShards: -1 as const }
          : { createdAt: -1 as const }

    const result = await listings.find(filter).sort(sortOrder).limit(100).toArray()

    return c.json({
      listings: result.map((l) => ({
        _id: l._id!.toString(),
        sellerId: l.sellerId,
        sellerUsername: l.sellerUsername,
        userEntityId: l.userEntityId.toString(),
        entitySnapshot: l.entitySnapshot,
        priceShards: l.priceShards,
        status: l.status,
        createdAt: l.createdAt,
      })),
    })
  } catch (err) {
    console.error("[market] list error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// ── POST /market/sell ─────────────────────────────────────────────────────────
marketRoutes.post("/sell", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string

  let body: { userEntityId?: string; priceShards?: number }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }

  const { userEntityId, priceShards } = body

  if (!userEntityId || typeof priceShards !== "number") {
    return c.json({ error: "userEntityId and priceShards are required" }, 400)
  }
  if (priceShards < 1 || !Number.isInteger(priceShards)) {
    return c.json({ error: "priceShards must be a positive integer" }, 400)
  }

  try {
    const db = await getDb()

    // P-39: límite de listings activos por usuario (se verifica antes que la propiedad)
    const sellerDoc = await usersCol(db).findOne(
      { clerkId },
      { projection: { listingLimit: 1 } }
    )
    const limit = sellerDoc?.listingLimit ?? DEFAULT_LISTING_LIMIT
    const activeCount = await marketListingsCol(db).countDocuments({
      sellerId: clerkId,
      status: "active",
    })
    if (activeCount >= limit) {
      return c.json(
        { error: `Active listing limit reached (${limit}). Cancel a listing before creating a new one.` },
        400
      )
    }

    // Validate ownership of the UserEntity
    const userEntity = await userEntitiesCol(db).findOne({
      _id: new ObjectId(userEntityId),
      ownerId: clerkId,
    })
    if (!userEntity) {
      return c.json({ error: "Entity not found or not owned by you" }, 404)
    }

    // Fetch the canonical entity doc for the snapshot + rarity check
    const entityDoc = await entitiesCol(db).findOne({ _id: userEntity.entityId })
    if (!entityDoc) {
      return c.json({ error: "Entity data not found" }, 404)
    }

    if (NON_BAZAAR.includes(entityDoc.rareza)) {
      return c.json({ error: "Dust and Nebula entities cannot be listed on the Bazaar" }, 400)
    }

    // Prevent duplicate listings for the same UserEntity
    const existingListing = await marketListingsCol(db).findOne({
      userEntityId: new ObjectId(userEntityId),
      status: "active",
    })
    if (existingListing) {
      return c.json({ error: "This entity is already listed" }, 409)
    }

    // Fetch seller username
    const seller = await usersCol(db).findOne({ clerkId })
    if (!seller) return c.json({ error: "User not found" }, 404)

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

    return c.json({ listingId: inserted.insertedId.toString(), message: "Listed successfully" })
  } catch (err) {
    console.error("[market] sell error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// ── POST /market/cancel ───────────────────────────────────────────────────────
// P-33: cancelar un listing propio; la entidad vuelve a estar disponible.
marketRoutes.post("/cancel", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string

  let body: { listingId?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }

  const { listingId } = body
  if (!listingId) return c.json({ error: "listingId is required" }, 400)

  try {
    const db = await getDb()

    // Atómico: solo cancela si el listing es del usuario y sigue activo
    const cancelled = await marketListingsCol(db).findOneAndUpdate(
      { _id: new ObjectId(listingId), sellerId: clerkId, status: "active" },
      { $set: { status: "cancelled", cancelledAt: new Date(), cancelledBy: clerkId } },
      { returnDocument: "after" }
    )
    if (!cancelled) {
      return c.json({ error: "Listing not found, not yours, or no longer active" }, 404)
    }

    await logAudit(db, c, {
      userId: clerkId,
      action: "market.listing.cancel",
      result: "success",
      details: { listingId },
    })

    return c.json({ success: true, status: "cancelled" })
  } catch (err) {
    console.error("[market] cancel error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

// ── POST /market/buy ──────────────────────────────────────────────────────────
marketRoutes.post("/buy", authMiddleware, async (c) => {
  const buyerClerkId = c.get("userId") as string

  let body: { listingId?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }

  const { listingId } = body
  if (!listingId) {
    return c.json({ error: "listingId is required" }, 400)
  }

  try {
    const db = await getDb()
    const listings = marketListingsCol(db)
    const users = usersCol(db)
    const userEntities = userEntitiesCol(db)

    const listing = await listings.findOne({ _id: new ObjectId(listingId) })
    if (!listing) return c.json({ error: "Listing not found" }, 404)
    if (listing.status !== "active") {
      return c.json({ error: "Listing is no longer available" }, 410)
    }
    if (listing.sellerId === buyerClerkId) {
      return c.json({ error: "Cannot buy your own listing" }, 400)
    }

    const buyer = await users.findOne({ clerkId: buyerClerkId })
    if (!buyer) return c.json({ error: "Buyer not found" }, 404)
    if (buyer.shards < listing.priceShards) {
      return c.json(
        { error: "Insufficient Shards", needed: listing.priceShards, have: buyer.shards },
        402
      )
    }

    // Atomically claim the listing — prevents double-buy without transactions
    const claimed = await listings.findOneAndUpdate(
      { _id: new ObjectId(listingId), status: "active" },
      { $set: { status: "sold", soldAt: new Date() } },
      { returnDocument: "after" }
    )
    if (!claimed) {
      return c.json({ error: "Listing was already purchased" }, 410)
    }

    // Deduct buyer shards
    await users.updateOne({ clerkId: buyerClerkId }, { $inc: { shards: -listing.priceShards } })

    // Credit seller 95% — 5% tribute is destroyed (not redistributed, per PRD)
    const sellerReceives = Math.floor(listing.priceShards * 0.95)
    await users.updateOne({ clerkId: listing.sellerId }, { $inc: { shards: sellerReceives } })

    // Transfer ownership of the UserEntity
    await userEntities.updateOne(
      { _id: listing.userEntityId },
      { $set: { ownerId: buyerClerkId, obtainedVia: "bazaar" } }
    )

    // Update inventory arrays: add to buyer, remove from seller
    await users.updateOne({ clerkId: buyerClerkId }, { $push: { inventory: listing.userEntityId } })
    await users.updateOne(
      { clerkId: listing.sellerId },
      { $pull: { inventory: listing.userEntityId } } as any
    )

    const updatedBuyer = await users.findOne({ clerkId: buyerClerkId })
    const buyerBalance = updatedBuyer?.shards ?? buyer.shards - listing.priceShards

    // P-40: registrar movimientos de ambas partes
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

    // P-38: notificar al vendedor de la venta
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

    return c.json({
      message: "Purchase successful",
      newShards: buyerBalance,
    })
  } catch (err) {
    console.error("[market] buy error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

export default marketRoutes
