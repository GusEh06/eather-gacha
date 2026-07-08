import { Hono } from "hono"
import { getDb } from "../db/client"
import {
  usersCol,
  marketListingsCol,
  shardTransactionsCol,
} from "../db/collections"

const metricsRoutes = new Hono()

/**
 * P-07: métricas de negocio en formato Prometheus exposition.
 * Protegido con API Key de operaciones (header X-Metrics-Key o ?key=).
 * Configurar METRICS_API_KEY en el entorno; sin ella el endpoint queda deshabilitado.
 */
metricsRoutes.get("/", async (c) => {
  const configuredKey = process.env.METRICS_API_KEY
  if (!configuredKey) {
    return c.text("metrics endpoint disabled (METRICS_API_KEY not set)", 503)
  }
  const providedKey = c.req.header("X-Metrics-Key") ?? c.req.query("key")
  if (providedKey !== configuredKey) {
    return c.text("unauthorized", 401)
  }

  try {
    const db = await getDb()
    const dayStart = new Date()
    dayStart.setUTCHours(0, 0, 0, 0)

    const [shardsAgg, activeListings, dailyInvocations, dailySales, totalUsers] =
      await Promise.all([
        usersCol(db)
          .aggregate<{ total: number }>([{ $group: { _id: null, total: { $sum: "$shards" } } }])
          .toArray(),
        marketListingsCol(db).countDocuments({ status: "active" }),
        shardTransactionsCol(db).countDocuments({
          type: "invocacion",
          createdAt: { $gte: dayStart },
        }),
        marketListingsCol(db).countDocuments({ status: "sold", soldAt: { $gte: dayStart } }),
        usersCol(db).countDocuments({}),
      ])

    const lines = [
      "# HELP aether_total_shards_circulating Total de Shards en manos de usuarios",
      "# TYPE aether_total_shards_circulating gauge",
      `aether_total_shards_circulating ${shardsAgg[0]?.total ?? 0}`,
      "# HELP aether_active_listings Listings activos en el Hollow Bazaar",
      "# TYPE aether_active_listings gauge",
      `aether_active_listings ${activeListings}`,
      "# HELP aether_daily_invocations Invocaciones gacha del día (UTC)",
      "# TYPE aether_daily_invocations gauge",
      `aether_daily_invocations ${dailyInvocations}`,
      "# HELP aether_daily_bazaar_sales Ventas completadas del Bazaar hoy (UTC)",
      "# TYPE aether_daily_bazaar_sales gauge",
      `aether_daily_bazaar_sales ${dailySales}`,
      "# HELP aether_total_users Usuarios registrados",
      "# TYPE aether_total_users gauge",
      `aether_total_users ${totalUsers}`,
    ]

    return c.text(lines.join("\n") + "\n", 200, {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    })
  } catch (err) {
    console.error("[metrics] error:", err)
    return c.text("internal error", 500)
  }
})

export default metricsRoutes
