import type { Db } from "mongodb"
import { ecosTransactionsCol, type EcosTransactionDoc } from "../db/collections"

/**
 * La Espiral: registra un movimiento de Ecos del Vacío en el historial.
 * amount negativo = gasto, positivo = ingreso. Nunca lanza (mismo contrato
 * que recordShardTransaction).
 */
export async function recordEcosTransaction(
  db: Db,
  entry: {
    userId: string
    type: EcosTransactionDoc["type"]
    amount: number
    balanceAfter: number
    description: string
  }
): Promise<void> {
  try {
    await ecosTransactionsCol(db).insertOne({ ...entry, createdAt: new Date() })
  } catch (err) {
    console.error("[ecosTransactions] failed to record ecos transaction:", err)
  }
}
