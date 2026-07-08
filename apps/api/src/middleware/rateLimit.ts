import type { Context, Next, MiddlewareHandler } from "hono"

/**
 * P-01: rate limiting por usuario/IP con ventana deslizante en memoria.
 * Nota: en un despliegue multi-instancia esto debe migrar a Redis; para una
 * sola instancia (docker-compose actual) el comportamiento es equivalente.
 */

interface Bucket {
  timestamps: number[]
}

const buckets = new Map<string, Bucket>()

// Limpieza periódica para no acumular llaves muertas
setInterval(() => {
  const cutoff = Date.now() - 5 * 60_000
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff)
    if (bucket.timestamps.length === 0) buckets.delete(key)
  }
}, 60_000).unref?.()

export function rateLimit(options: {
  /** identificador del límite (ej. "invoke") para separar buckets por endpoint */
  name: string
  /** máximo de peticiones dentro de la ventana */
  max: number
  /** tamaño de ventana en ms */
  windowMs: number
}): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    // Después de authMiddleware hay userId; si no, cae a IP
    const userId = c.get("userId") as string | undefined
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "unknown"
    const key = `${options.name}:${userId ?? ip}`

    const now = Date.now()
    const bucket = buckets.get(key) ?? { timestamps: [] }
    bucket.timestamps = bucket.timestamps.filter((t) => t > now - options.windowMs)

    if (bucket.timestamps.length >= options.max) {
      const oldest = bucket.timestamps[0]!
      const retryAfterSec = Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000))
      c.header("Retry-After", String(retryAfterSec))
      return c.json(
        { error: "Too many requests", retryAfterSeconds: retryAfterSec },
        429
      )
    }

    bucket.timestamps.push(now)
    buckets.set(key, bucket)
    await next()
  }
}
