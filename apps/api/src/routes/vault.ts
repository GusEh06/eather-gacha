import { Hono } from "hono"
import Stripe from "stripe"
import { getDb } from "../db/client"
import { usersCol } from "../db/collections"
import { authMiddleware } from "../middleware/auth"

// Lazy Stripe init — avoids throwing at import if env var not configured
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
    _stripe = new Stripe(key)
  }
  return _stripe
}

// Package catalogue — aligned to PRD §6
const PACKAGES: Record<string, { name: string; shards: number; priceCents: number }> = {
  spark_of_aether:  { name: "Spark of Aether",  shards: 100,  priceCents:  199 },
  astral_fragment:  { name: "Astral Fragment",   shards: 350,  priceCents:  499 },
  nova_surge:       { name: "Nova Surge",        shards: 850,  priceCents:  999 },
  singularity_core: { name: "Singularity Core",  shards: 2000, priceCents: 1999 },
}

const vaultRoutes = new Hono()

// POST /vault/create-checkout — authenticated; creates Stripe hosted checkout session
vaultRoutes.post("/create-checkout", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string

  let body: { packageId?: string } | null = null
  try {
    body = await c.req.json<{ packageId: string }>()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }

  if (!body?.packageId) {
    return c.json({ error: "packageId is required" }, 400)
  }

  const pkg = PACKAGES[body.packageId]
  if (!pkg) {
    return c.json({ error: "Invalid packageId" }, 400)
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000"

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: pkg.priceCents,
            product_data: {
              name: `${pkg.name} — ◈ ${pkg.shards.toLocaleString("en-US")} Shards`,
              description: "Aether Gacha Shards",
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        clerkId,
        packageId: body.packageId,
      },
      success_url: `${appUrl}/vault?success=true`,
      cancel_url: `${appUrl}/vault?cancelled=true`,
    })

    return c.json({ url: session.url })
  } catch (err) {
    console.error("[vault] Stripe checkout error:", err)
    return c.json({ error: "Failed to create checkout session" }, 500)
  }
})

// POST /vault/webhook — raw body; Stripe signature verification
vaultRoutes.post("/webhook", async (c) => {
  const rawBody = await c.req.text()
  const sig = c.req.header("stripe-signature") ?? ""
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.warn("[vault] STRIPE_WEBHOOK_SECRET not set — skipping signature verification")
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    if (webhookSecret) {
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret)
    } else {
      event = JSON.parse(rawBody) as Stripe.Event
    }
  } catch (err) {
    console.error("[vault] Webhook signature verification failed:", err)
    return c.json({ error: "Invalid signature" }, 400)
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const { clerkId, packageId } = session.metadata ?? {}

    if (!clerkId || !packageId) {
      console.error("[vault] Missing metadata in checkout session:", session.id)
      return c.json({ error: "Missing metadata" }, 400)
    }

    const pkg = PACKAGES[packageId]
    if (!pkg) {
      console.error("[vault] Unknown packageId in metadata:", packageId)
      return c.json({ error: "Unknown packageId" }, 400)
    }

    try {
      const db = await getDb()
      const users = usersCol(db)
      await users.updateOne(
        { clerkId },
        { $inc: { shards: pkg.shards } },
        { upsert: true },
      )
      console.log(`[vault] Credited ${pkg.shards} shards to ${clerkId} (${packageId})`)
    } catch (err) {
      console.error("[vault] Failed to credit shards:", err)
      return c.json({ error: "Internal error" }, 500)
    }
  }

  return c.json({ received: true })
})

export default vaultRoutes
