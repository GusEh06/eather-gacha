import type { Db } from "mongodb"
import type { Context } from "hono"
import { auditLogsCol } from "../db/collections"

/**
 * P-04: registra una acción crítica en el log de auditoría (append-only).
 * Nunca lanza: un fallo de auditoría no debe tumbar la operación de negocio.
 */
export async function logAudit(
  db: Db,
  c: Context | null,
  entry: {
    userId: string
    action: string
    result: "success" | "failure"
    details?: Record<string, unknown>
  }
): Promise<void> {
  try {
    await auditLogsCol(db).insertOne({
      timestamp: new Date(),
      requestId: c?.get("requestId") as string | undefined,
      ip:
        c?.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
        c?.req.header("x-real-ip") ??
        undefined,
      ...entry,
    })
  } catch (err) {
    console.error("[audit] failed to write audit log:", err)
  }
}
