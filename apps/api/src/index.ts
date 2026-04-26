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

const app = new Hono()

app.use("*", logger())
app.use(
  "*",
  cors({
    origin: process.env.WEB_APP_URL ?? "http://localhost:3000",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
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

// Start midnight Rift rotation cron after DB is ready
getDb()
  .then((db) => startRiftCron(db))
  .catch((err) => console.error("[cron] Failed to start rift cron:", err))

export default {
  port: 3001,
  fetch: app.fetch,
}
