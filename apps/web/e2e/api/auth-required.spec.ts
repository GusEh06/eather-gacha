import { test, expect } from "@playwright/test"

const API_URL = process.env.API_URL ?? "http://localhost:3001"

// H-01 / H-22: el authMiddleware debe rechazar peticiones sin JWT valido
// en todos los endpoints protegidos, retornando 401.
test.describe("Protected endpoints require authentication", () => {
  const protectedRequests: Array<{ name: string; method: "GET" | "POST" | "PATCH"; path: string }> = [
    { name: "user profile", method: "GET", path: "/user/profile" },
    { name: "user inventory", method: "GET", path: "/user/inventory" },
    { name: "user transactions", method: "GET", path: "/user/transactions" },
    { name: "invoke gacha", method: "POST", path: "/invoke" },
    { name: "market sell", method: "POST", path: "/market/sell" },
    { name: "market buy", method: "POST", path: "/market/buy" },
    { name: "rift buy", method: "POST", path: "/rift/buy" },
    { name: "vault checkout", method: "POST", path: "/vault/create-checkout" },
    { name: "admin stats", method: "GET", path: "/admin/stats" },
    { name: "admin users", method: "GET", path: "/admin/users" },
  ]

  for (const { name, method, path } of protectedRequests) {
    test(`${name} (${method} ${path}) returns 401 without a token`, async ({ request }) => {
      const res = await request.fetch(`${API_URL}${path}`, { method, data: {} })
      expect(res.status()).toBe(401)
    })
  }

  test("rejects a malformed bearer token", async ({ request }) => {
    const res = await request.get(`${API_URL}/user/profile`, {
      headers: { Authorization: "Bearer not-a-real-jwt" },
    })
    expect(res.status()).toBe(401)
  })
})
