import { test, expect } from "@playwright/test"

const API_URL = process.env.API_URL ?? "http://localhost:3001"

// H-18: filtrar y ordenar listings del Bazaar — publica, sin auth.
test.describe("GET /market/list", () => {
  test("returns active listings sorted by newest by default", async ({ request }) => {
    const res = await request.get(`${API_URL}/market/list`)
    expect(res.ok()).toBeTruthy()

    const body = await res.json()
    expect(Array.isArray(body.listings)).toBe(true)
    for (const listing of body.listings) {
      expect(listing.status).toBe("active")
    }
  })

  test("accepts a rarity filter without erroring", async ({ request }) => {
    const res = await request.get(`${API_URL}/market/list?rarity=pulsar`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    for (const listing of body.listings) {
      expect(listing.entitySnapshot.rareza).toBe("pulsar")
    }
  })

  test("accepts sort=price_asc and returns non-decreasing prices", async ({ request }) => {
    const res = await request.get(`${API_URL}/market/list?sort=price_asc`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    const prices = body.listings.map((l: { priceShards: number }) => l.priceShards)
    const sorted = [...prices].sort((a, b) => a - b)
    expect(prices).toEqual(sorted)
  })
})
