import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import clerkRoutes from "./routes/clerk"
import userRoutes from "./routes/user"
import invokeRoutes from "./routes/invoke"
import marketRoutes from "./routes/market"
import riftRoutes from "./routes/rift"
import vaultRoutes from "./routes/vault"
import { startRiftCron } from "./crons/riftRotation"
import { getDb } from "./db/client"
import { requestIdMiddleware } from "./middleware/requestId"

import adminRoutes from "./routes/admin"
import metricsRoutes from "./routes/metrics"

const app = new Hono()

// P-08: ID de correlación por request (antes que el logger para que aparezca en logs)
app.use("*", requestIdMiddleware)
app.use("*", logger())

// P-03: CORS endurecido — lista de orígenes permitidos vía ALLOWED_ORIGINS
// (separados por coma). Fallback: WEB_APP_URL o localhost en desarrollo.
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ??
  process.env.WEB_APP_URL ??
  "http://localhost:3000"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  "*",
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
)

// Health check
app.get("/health", (c) => c.json({ status: "ok", service: "aether-api" }))

// Routes
app.route("/clerk", clerkRoutes)
app.route("/user", userRoutes)
app.route("/invoke", invokeRoutes)
app.route("/market", marketRoutes)
app.route("/rift", riftRoutes)
app.route("/vault", vaultRoutes)
app.route("/admin", adminRoutes)
app.route("/metrics", metricsRoutes)

// Start midnight Rift rotation cron after DB is ready
getDb()
  .then((db) => startRiftCron(db))
  .catch((err) => console.error("[cron] Failed to start rift cron:", err))

export default {
  port: 3001,
  fetch: app.fetch,
}
