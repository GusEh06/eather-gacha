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
import { buyListing, createListing, MarketError } from "../services/marketService"

const marketRoutes = new Hono()

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

  try {
    const db = await getDb()
    const result = await createListing(db, clerkId, userEntityId, priceShards, c)
    return c.json(result)
  } catch (err) {
    if (err instanceof MarketError) {
      return c.json({ error: err.message, ...err.extra }, err.status as 400 | 404 | 409)
    }
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
    const result = await buyListing(db, buyerClerkId, listingId, c)
    return c.json(result)
  } catch (err) {
    if (err instanceof MarketError) {
      return c.json({ error: err.message, ...err.extra }, err.status as 400 | 402 | 404 | 410)
    }
    console.error("[market] buy error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

export default marketRoutes
