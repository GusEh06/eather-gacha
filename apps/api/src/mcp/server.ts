import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import * as z from "zod"
import type { Db } from "mongodb"
import { entitiesCol, marketListingsCol, userEntitiesCol } from "../db/collections"
import { getOrProvisionProfile } from "../services/profileService"
import { getCurrentRiftRotation } from "../services/rift"
import { performInvoke, InvokeError } from "../services/invokeService"
import { buyListing, MarketError } from "../services/marketService"

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] }
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true }
}

/**
 * Crea un McpServer con las tools de Aether Gacha, todas resueltas contra el
 * `userId` (clerkId) ya autenticado por `mcpAuthMiddleware`. Cada tool reutiliza
 * los mismos servicios que usan las rutas REST — no hay lógica de negocio
 * duplicada. Se crea una instancia nueva por request (modo stateless), igual
 * que recomienda el SDK para transportes HTTP sin sesión.
 */
export function createMcpServerForUser(db: Db, userId: string): McpServer {
  const server = new McpServer({ name: "aether-gacha-mcp", version: "1.0.0" })

  server.registerTool(
    "get_profile",
    {
      title: "Obtener perfil",
      description: "Obtiene el perfil del Aether Binder autenticado: username, título, Shards, pity e inventario.",
      inputSchema: {},
    },
    async () => {
      const user = await getOrProvisionProfile(db, userId)
      return textResult({
        clerkId: user.clerkId,
        username: user.username,
        title: user.title,
        shards: user.shards,
        pityCounter: user.pityCounter,
        pityMythicCounter: user.pityMythicCounter,
        inventoryCount: (user.inventory ?? []).length,
        createdAt: user.createdAt,
      })
    }
  )

  server.registerTool(
    "get_inventory",
    {
      title: "Consultar inventario",
      description: "Lista las entidades que posee el Aether Binder autenticado.",
      inputSchema: {},
    },
    async () => {
      const owned = await userEntitiesCol(db).find({ ownerId: userId }).toArray()
      const entityIds = owned.map((ue) => ue.entityId)
      const entityDocs = await entitiesCol(db).find({ _id: { $in: entityIds } }).toArray()
      const entityMap = new Map(entityDocs.map((e) => [e._id!.toString(), e]))

      return textResult({
        inventory: owned.map((ue) => ({
          _id: ue._id!.toString(),
          entityId: ue.entityId.toString(),
          obtainedAt: ue.obtainedAt,
          obtainedVia: ue.obtainedVia,
          entity: entityMap.get(ue.entityId.toString()) ?? null,
        })),
      })
    }
  )

  server.registerTool(
    "get_shard_balance",
    {
      title: "Consultar balance de Shards",
      description: "Devuelve el balance actual de Shards del Aether Binder autenticado.",
      inputSchema: {},
    },
    async () => {
      const user = await getOrProvisionProfile(db, userId)
      return textResult({ shards: user.shards })
    }
  )

  server.registerTool(
    "get_pity_status",
    {
      title: "Consultar status de pity",
      description: "Devuelve el contador de pity (raro y mítico) del Aether Binder autenticado.",
      inputSchema: {},
    },
    async () => {
      const user = await getOrProvisionProfile(db, userId)
      return textResult({
        pityCounter: user.pityCounter,
        pityMythicCounter: user.pityMythicCounter,
      })
    }
  )

  server.registerTool(
    "invoke_gacha",
    {
      title: "Ejecutar invocación gacha",
      description:
        "Ejecuta una invocación gacha (x1 cuesta 160 Shards, x10 cuesta 1600 Shards) en nombre del usuario. Gasta Shards reales — confirma con el usuario antes de llamarla.",
      inputSchema: { mode: z.enum(["x1", "x10"]).describe("x1 o x10") },
    },
    async ({ mode }) => {
      try {
        const result = await performInvoke(db, userId, mode, null)
        return textResult(result)
      } catch (err) {
        if (err instanceof InvokeError) return errorResult(err.message)
        throw err
      }
    }
  )

  server.registerTool(
    "list_bazaar",
    {
      title: "Listar Hollow Bazaar",
      description: "Lista las entidades activas en venta en el Hollow Bazaar, con filtro opcional de rareza.",
      inputSchema: { rarity: z.string().optional().describe("Filtrar por rareza (opcional)") },
    },
    async ({ rarity }) => {
      const filter: Record<string, unknown> = { status: "active" }
      if (rarity) filter["entitySnapshot.rareza"] = rarity

      const listings = await marketListingsCol(db)
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray()

      return textResult({
        listings: listings.map((l) => ({
          _id: l._id!.toString(),
          sellerUsername: l.sellerUsername,
          entitySnapshot: l.entitySnapshot,
          priceShards: l.priceShards,
          createdAt: l.createdAt,
        })),
      })
    }
  )

  server.registerTool(
    "buy_bazaar_listing",
    {
      title: "Comprar en el Hollow Bazaar",
      description:
        "Compra un listing activo del Hollow Bazaar en nombre del usuario. Gasta Shards reales — confirma con el usuario (y el listingId) antes de llamarla.",
      inputSchema: { listingId: z.string().describe("ID del listing a comprar") },
    },
    async ({ listingId }) => {
      try {
        const result = await buyListing(db, userId, listingId, null)
        return textResult(result)
      } catch (err) {
        if (err instanceof MarketError) return errorResult(err.message)
        throw err
      }
    }
  )

  server.registerTool(
    "get_rift_rotation",
    {
      title: "Consultar rotación del Rift",
      description: "Devuelve la rotación actual del Rift (5 slots diarios) con precios y disponibilidad.",
      inputSchema: {},
    },
    async () => {
      const rotation = await getCurrentRiftRotation(db)
      const entityIds = rotation.slots.map((s) => s.entityId)
      const entityDocs = await entitiesCol(db).find({ _id: { $in: entityIds } }).toArray()
      const entityMap = new Map(entityDocs.map((e) => [e._id!.toString(), e]))

      return textResult({
        date: rotation.date,
        expiresAt: rotation.expiresAt,
        slots: rotation.slots.map((slot, idx) => ({
          index: idx,
          priceShards: slot.priceShards,
          sold: slot.sold,
          entity: entityMap.get(slot.entityId.toString()) ?? null,
        })),
      })
    }
  )

  return server
}
