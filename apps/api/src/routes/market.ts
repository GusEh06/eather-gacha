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

const marketRoutes = new Hono()

const NON_BAZAAR = ["dust", "nebula"]

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

    const sortOrder =
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

    return c.json({ listingId: inserted.insertedId.toString(), message: "Listed successfully" })
  } catch (err) {
    console.error("[market] sell error:", err)
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

    return c.json({
      message: "Purchase successful",
      newShards: updatedBuyer?.shards ?? buyer.shards - listing.priceShards,
    })
  } catch (err) {
    console.error("[market] buy error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

export default marketRoutes
