import type { Context, Next } from "hono"

/**
 * P-08: ID de correlación por request.
 * Respeta el X-Request-Id entrante (correlación end-to-end) o genera un UUID v4.
 * El ID se propaga en el contexto y en la respuesta HTTP.
 */
export async function requestIdMiddleware(c: Context, next: Next): Promise<void> {
  const incoming = c.req.header("X-Request-Id")
  const requestId = incoming && incoming.length <= 128 ? incoming : crypto.randomUUID()
  c.set("requestId", requestId)
  c.header("X-Request-Id", requestId)
  await next()
}
