import { Hono } from "hono"
import { getDb } from "../db/client"
import { usersCol } from "../db/collections"

const ONBOARDING_SHARDS = 320

const clerkRoutes = new Hono()

/**
 * Verify Clerk webhook signature using Bun/Web Crypto.
 * Clerk uses the Svix signing scheme: HMAC-SHA256 over
 * `${svix-id}.${svix-timestamp}.${rawBody}` with the
 * whsec_ base64-encoded secret.
 */
async function verifyClerkWebhook(
  rawBody: string,
  svixId: string,
  svixTimestamp: string,
  svixSignatureHeader: string,
  secret: string,
): Promise<boolean> {
  try {
    // Strip "whsec_" prefix if present
    const secretBase64 = secret.startsWith("whsec_")
      ? secret.slice(6)
      : secret

    const secretBytes = Uint8Array.from(atob(secretBase64), (c) => c.charCodeAt(0))

    const key = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    )

    const message = `${svixId}.${svixTimestamp}.${rawBody}`
    const msgBytes = new TextEncoder().encode(message)

    // Header can have multiple signatures separated by spaces (v1,<sig>)
    const signatures = svixSignatureHeader
      .split(" ")
      .filter((s) => s.startsWith("v1,"))
      .map((s) => {
        const b64 = s.slice(3)
        return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      })

    for (const sig of signatures) {
      const ok = await crypto.subtle.verify("HMAC", key, sig, msgBytes)
      if (ok) return true
    }
    return false
  } catch {
    return false
  }
}

// POST /clerk/webhook
clerkRoutes.post("/webhook", async (c) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error("[clerk] CLERK_WEBHOOK_SECRET is not set — rejecting webhook call")
    return c.json({ error: "Webhook secret not configured" }, 500)
  }

  const rawBody = await c.req.text()
  const svixId = c.req.header("svix-id") ?? ""
  const svixTimestamp = c.req.header("svix-timestamp") ?? ""
  const svixSignature = c.req.header("svix-signature") ?? ""

  // Verify signature — secret is guaranteed present at this point
  const valid = await verifyClerkWebhook(
    rawBody, svixId, svixTimestamp, svixSignature, webhookSecret,
  )
  if (!valid) {
    return c.json({ error: "Invalid webhook signature" }, 400)
  }

  let evt: { type: string; data: Record<string, unknown> }
  try {
    evt = JSON.parse(rawBody)
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }

  if (evt.type === "user.created") {
    const data = evt.data as {
      id: string
      username?: string
      email_addresses?: Array<{ email_address: string }>
    }

    const clerkId = data.id
    const username =
      data.username ??
      data.email_addresses?.[0]?.email_address?.split("@")[0] ??
      `binder_${clerkId.slice(-6)}`

    try {
      const db = await getDb()
      const users = usersCol(db)

      const existing = await users.findOne({ clerkId })
      if (!existing) {
        await users.insertOne({
          clerkId,
          username,
          title: "Aether Binder",
          shards: ONBOARDING_SHARDS,
          pityCounter: 0,
          pityMythicCounter: 0,
          inventory: [],
          createdAt: new Date(),
        })
        console.log(
          `[clerk] Created Aether Binder ${username} (${clerkId}) with ${ONBOARDING_SHARDS} Shards`,
        )
      }
    } catch (err) {
      console.error("[clerk] Failed to create user:", err)
      return c.json({ error: "Internal error" }, 500)
    }
  }

  return c.json({ received: true })
})

export default clerkRoutes
