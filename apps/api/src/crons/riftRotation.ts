import type { Db } from "mongodb"
import { generateRiftRotation } from "../services/rift"

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
