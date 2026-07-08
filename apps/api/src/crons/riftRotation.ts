import type { Db } from "mongodb"
import { generateRiftRotation } from "../services/rift"
import { usersCol, notificationsCol } from "../db/collections"

/** P-38: notifica a los usuarios activos (últimos 7 días) que el Rift rotó. */
async function notifyRiftRotation(db: Db): Promise<void> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3_600_000)
    const activeUsers = await usersCol(db)
      .find({ createdAt: { $gte: sevenDaysAgo } }, { projection: { clerkId: 1 } })
      .limit(1000)
      .toArray()
    if (activeUsers.length === 0) return

    const now = new Date()
    await notificationsCol(db).insertMany(
      activeUsers.map((u) => ({
        userId: u.clerkId,
        type: "rift_rotation" as const,
        title: "El Rift ha rotado",
        message: "Hay 5 nuevas entidades disponibles en The Rift por las próximas 24 horas.",
        read: false,
        createdAt: now,
      }))
    )
    console.log(`[rift-cron] Notified ${activeUsers.length} users of the new rotation`)
  } catch (err) {
    console.error("[rift-cron] Failed to notify users:", err)
  }
}

function msUntilNextMidnight(): number {
  const now = new Date()
  const midnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  )
  return midnight.getTime() - now.getTime()
}

function scheduleNextMidnight(db: Db): void {
  const delay = msUntilNextMidnight()
  console.log(`[rift-cron] Next rotation in ${Math.round(delay / 60000)} minutes`)

  setTimeout(async () => {
    try {
      await generateRiftRotation(db)
      console.log("[rift-cron] Rotation generated for", new Date().toISOString().split("T")[0])
      await notifyRiftRotation(db)
    } catch (err) {
      console.error("[rift-cron] Failed to generate rotation:", err)
    }
    // Schedule the next midnight regardless of success/failure
    scheduleNextMidnight(db)
  }, delay)
}

/** Start the midnight Rift rotation cron.
 *  Uses chained setTimeout — no extra dependencies needed. */
export function startRiftCron(db: Db): void {
  scheduleNextMidnight(db)
}
