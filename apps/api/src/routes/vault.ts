import { Hono } from "hono"
import Stripe from "stripe"
import { getDb } from "../db/client"
import { usersCol } from "../db/collections"
import { authMiddleware } from "../middleware/auth"
import { rateLimit } from "../middleware/rateLimit"
import { logAudit } from "../services/audit"
import { recordShardTransaction } from "../services/transactions"

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

// P-01: máximo 5 checkouts por minuto por usuario
const checkoutRateLimit = rateLimit({ name: "checkout", max: 5, windowMs: 60_000 })

// POST /vault/create-checkout — authenticated; creates Stripe hosted checkout session
vaultRoutes.post("/create-checkout", authMiddleware, checkoutRateLimit, async (c) => {
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
      success_url: `${appUrl}/vault?success=true&session_id={CHECKOUT_SESSION_ID}`,
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
  const cliSecret = process.env.STRIPE_CLI_WEBHOOK_SECRET

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    // Try CLI secret first (local dev), then dashboard secret (prod)
    // If neither is set, accept the raw event (dev-only fallback)
    if (cliSecret || webhookSecret) {
      let verified = false
      for (const secret of [cliSecret, webhookSecret].filter(Boolean) as string[]) {
        try {
          event = await stripe.webhooks.constructEventAsync(rawBody, sig, secret)
          verified = true
          break
        } catch {
          // try next
        }
      }
      if (!verified) {
        console.error("[vault] Webhook signature verification failed with all known secrets")
        return c.json({ error: "Invalid signature" }, 400)
      }
    } else {
      console.warn("[vault] No webhook secrets configured — skipping signature verification")
      event = JSON.parse(rawBody) as Stripe.Event
    }
  } catch (err) {
    console.error("[vault] Webhook error during event parsing:", err)
    return c.json({ error: "Invalid webhook payload" }, 400)
  }

  if (event!.type === "checkout.session.completed") {
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

      // Idempotencia compartida con /verify-purchase: si la sesión ya fue
      // procesada por cualquiera de los dos caminos, no acreditar de nuevo.
      const processed = db.collection<{ sessionId: string; clerkId: string; processedAt: Date }>(
        "processed_checkouts"
      )
      await processed.createIndex({ sessionId: 1 }, { unique: true })
      try {
        await processed.insertOne({ sessionId: session.id, clerkId, processedAt: new Date() })
      } catch {
        console.log(`[vault] webhook: session ${session.id} already credited — skipping`)
        return c.json({ received: true })
      }

      await users.updateOne(
        { clerkId },
        {
          $inc: { shards: pkg.shards },
          $setOnInsert: {
            username: `binder_${clerkId.slice(-6)}`,
            title: "Aether Binder",
            pityCounter: 0,
            pityMythicCounter: 0,
            inventory: [],
            createdAt: new Date(),
          },
        },
        { upsert: true },
      )
      const credited = await users.findOne({ clerkId })
      await recordShardTransaction(db, {
        userId: clerkId,
        type: "recarga",
        amount: pkg.shards,
        balanceAfter: credited?.shards ?? pkg.shards,
        description: `Recarga vía Stripe: ${pkg.name} (+${pkg.shards} Sh)`,
      })
      await logAudit(db, null, {
        userId: clerkId,
        action: "vault.purchase.webhook",
        result: "success",
        details: { packageId, shards: pkg.shards, sessionId: session.id },
      })
      console.log(`[vault] Credited ${pkg.shards} shards to ${clerkId} (${packageId})`)
    } catch (err) {
      console.error("[vault] Failed to credit shards:", err)
      return c.json({ error: "Internal error" }, 500)
    }
  }

  return c.json({ received: true })
})

// GET /vault/verify-purchase?sessionId=... — authenticated
// Verifica que el pago fue completado en Stripe y acredita shards (idempotente).
// Esto resuelve el problema de que en desarrollo el webhook de Stripe no llega a localhost.
vaultRoutes.get("/verify-purchase", authMiddleware, async (c) => {
  const clerkId = c.get("userId") as string
  const sessionId = c.req.query("sessionId")

  if (!sessionId) {
    return c.json({ error: "sessionId is required" }, 400)
  }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Verificar que el pago fue completado
    if (session.payment_status !== "paid") {
      return c.json({ error: "Payment not completed", status: session.payment_status }, 402)
    }

    // Verificar que la sesion pertenece al usuario autenticado
    if (session.metadata?.clerkId !== clerkId) {
      return c.json({ error: "Unauthorized" }, 403)
    }

    const packageId = session.metadata?.packageId
    const pkg = packageId ? PACKAGES[packageId] : null
    if (!pkg) {
      return c.json({ error: "Unknown package" }, 400)
    }

    const db = await getDb()

    // Idempotencia: usar una coleccion separada para rastrear sesiones ya procesadas.
    // Si la sesion ya fue procesada, simplemente devolvemos el balance actual.
    const processed = db.collection<{ sessionId: string; clerkId: string; processedAt: Date }>(
      "processed_checkouts"
    )

    // Crear indice unico si no existe (esto es un no-op si ya existe)
    await processed.createIndex({ sessionId: 1 }, { unique: true })

    let alreadyProcessed = false
    try {
      await processed.insertOne({ sessionId, clerkId, processedAt: new Date() })
    } catch {
      // Duplicate key = sesion ya procesada
      alreadyProcessed = true
    }

    const users = usersCol(db)

    if (!alreadyProcessed) {
      // Primera vez: acreditar shards
      await users.updateOne(
        { clerkId },
        {
          $inc: { shards: pkg.shards },
          $setOnInsert: {
            username: `binder_${clerkId.slice(-6)}`,
            title: "Aether Binder",
            pityCounter: 0,
            pityMythicCounter: 0,
            inventory: [],
            createdAt: new Date(),
          },
        },
        { upsert: true }
      )
      const credited = await users.findOne({ clerkId })
      await recordShardTransaction(db, {
        userId: clerkId,
        type: "recarga",
        amount: pkg.shards,
        balanceAfter: credited?.shards ?? pkg.shards,
        description: `Recarga vía Stripe: ${pkg.name} (+${pkg.shards} Sh)`,
      })
      await logAudit(db, c, {
        userId: clerkId,
        action: "vault.purchase.verify",
        result: "success",
        details: { packageId, shards: pkg.shards, sessionId },
      })
      console.log(`[vault] verify-purchase: credited ${pkg.shards} shards to ${clerkId} (${packageId})`)
    } else {
      console.log(`[vault] verify-purchase: session ${sessionId} already processed for ${clerkId}`)
    }

    // Devolver el balance actualizado
    const user = await users.findOne({ clerkId })
    return c.json({ shards: user?.shards ?? 0, alreadyProcessed })
  } catch (err) {
    console.error("[vault] verify-purchase error:", err)
    return c.json({ error: "Internal error" }, 500)
  }
})

export default vaultRoutes
