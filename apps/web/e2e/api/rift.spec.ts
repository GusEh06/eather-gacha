import { test, expect } from "@playwright/test"

const API_URL = process.env.API_URL ?? "http://localhost:3001"

// H-12: ver la rotacion diaria de The Rift — publica, sin auth.
test.describe("GET /rift/current", () => {
  test("returns today's rotation with 5 priced slots", async ({ request }) => {
    const res = await request.get(`${API_URL}/rift/current`)
    expect(res.ok()).toBeTruthy()

    const body = await res.json()
    expect(body).toHaveProperty("date")
    expect(body).toHaveProperty("expiresAt")
    expect(Array.isArray(body.slots)).toBe(true)
    expect(body.slots).toHaveLength(5)

    for (const slot of body.slots) {
      expect(slot).toHaveProperty("index")
      expect(slot).toHaveProperty("priceShards")
      expect(slot).toHaveProperty("sold")
      expect(typeof slot.priceShards).toBe("number")
    }
  })
})
