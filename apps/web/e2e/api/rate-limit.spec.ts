import { test, expect } from "@playwright/test"

const API_URL = process.env.API_URL ?? "http://localhost:3001"

// P-01: el checkout de Stripe acepta maximo 5 peticiones/min por usuario.
// Sin token valido las primeras peticiones fallan con 401 (antes del rate
// limiter), pero tras 5+ intentos rapidos igual deberiamos ver actividad
// del limiter una vez autenticado. Aqui verificamos el contrato observable
// sin credenciales: el header Retry-After aparece cuando el limite se
// alcanza en un endpoint publico-friendly como health no aplica, asi que
// probamos contra un endpoint autenticado y confirmamos que 401 no se
// confunde con 429 bajo trafico normal.
test.describe("Rate limiting contract", () => {
  test("a handful of unauthenticated requests still return 401, not 429", async ({ request }) => {
    for (let i = 0; i < 3; i++) {
      const res = await request.post(`${API_URL}/vault/create-checkout`, { data: {} })
      expect(res.status()).toBe(401)
    }
  })
})
