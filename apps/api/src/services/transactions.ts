import type { Db } from "mongodb"
import { shardTransactionsCol, type ShardTransactionDoc } from "../db/collections"

/**
 * P-40: registra un movimiento de Shards en el historial del usuario.
 * amount negativo = gasto, positivo = ingreso. Nunca lanza.
 */
export async function recordShardTransaction(
  db: Db,
  entry: {
    userId: string
    type: ShardTransactionDoc["type"]
    amount: number
    balanceAfter: number
    description: string
  }
): Promise<void> {
  try {
    await shardTransactionsCol(db).insertOne({ ...entry, createdAt: new Date() })
  } catch (err) {
    console.error("[transactions] failed to record shard transaction:", err)
  }
}
