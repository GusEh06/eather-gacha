import type { Db } from "mongodb"
import { usersCol, type UserDoc } from "../db/collections"

const ONBOARDING_SHARDS = 320

/**
 * Devuelve el perfil del usuario, auto-provisionándolo con el saldo inicial de
 * Shards si es su primera petición autenticada (no dependemos del webhook de
 * Clerk, que no llega en desarrollo local). Usado por la ruta REST GET
 * /user/profile y por las tools MCP get_profile/get_shard_balance/get_pity_status.
 */
export async function getOrProvisionProfile(db: Db, clerkId: string): Promise<UserDoc> {
  const users = usersCol(db)
  let user = await users.findOne({ clerkId })

  if (!user) {
    const newUser: UserDoc = {
      clerkId,
      username: `binder_${clerkId.slice(-6)}`,
      title: "Aether Binder",
      shards: ONBOARDING_SHARDS,
      pityCounter: 0,
      pityMythicCounter: 0,
      inventory: [],
      createdAt: new Date(),
    }
    await users.insertOne(newUser)
    console.log(`[user] Auto-provisioned Aether Binder (${clerkId}) with ${ONBOARDING_SHARDS} Shards`)
    user = await users.findOne({ clerkId })
  }

  if (!user) throw new Error("Failed to provision user")
  return user
}
