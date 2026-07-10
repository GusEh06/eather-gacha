import type { Context, Next } from "hono"
import { createHash } from "node:crypto"
import { getDb } from "../db/client"
import { apiKeysCol } from "../db/collections"

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex")
}

/**
 * Autenticación del servidor MCP: valida la API key personal del Aether Binder
 * (header `Authorization: Bearer <apiKey>`), generada vía POST /user/mcp-key.
 * Resuelve el mismo `userId` (clerkId) que usa el resto de la API para que las
 * tools MCP reutilicen la lógica de negocio existente sin duplicarla.
 */
export async function mcpAuthMiddleware(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: missing API key" }, 401)
  }

  const rawKey = authHeader.replace("Bearer ", "").trim()
  if (!rawKey) {
    return c.json({ error: "Unauthorized: missing API key" }, 401)
  }

  const keyHash = hashApiKey(rawKey)

  try {
    const db = await getDb()
    const apiKey = await apiKeysCol(db).findOne({ keyHash })
    if (!apiKey) {
      return c.json({ error: "Unauthorized: invalid API key" }, 401)
    }

    apiKeysCol(db)
      .updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } })
      .catch(() => {})

    c.set("userId", apiKey.userId)
    c.set("mcpAuthenticated", true)
  } catch (err) {
    console.error("[mcpAuth] failed to validate API key:", err)
    return c.json({ error: "Internal error" }, 500)
  }

  await next()
}
