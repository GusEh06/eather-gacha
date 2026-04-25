import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import clerkRoutes from "./routes/clerk"
import userRoutes from "./routes/user"

const app = new Hono()

app.use("*", logger())
app.use(
  "*",
  cors({
    origin: process.env.VITE_API_URL ?? "http://localhost:3000",
    credentials: true,
  })
)

// Health check
app.get("/health", (c) => c.json({ status: "ok", service: "aether-api" }))

// Routes
app.route("/clerk", clerkRoutes)
app.route("/user", userRoutes)

export default {
  port: 3001,
  fetch: app.fetch,
}
