import type { Db } from "mongodb"
import { notificationsCol, type NotificationDoc } from "../db/collections"

/**
 * P-38: crea una notificación in-app para un usuario. Nunca lanza.
 */
export async function createNotification(
  db: Db,
  entry: {
    userId: string
    type: NotificationDoc["type"]
    title: string
    message: string
  }
): Promise<void> {
  try {
    await notificationsCol(db).insertOne({ ...entry, read: false, createdAt: new Date() })
  } catch (err) {
    console.error("[notifications] failed to create notification:", err)
  }
}
