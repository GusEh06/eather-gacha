import { test, expect } from "@playwright/test"

const API_URL = process.env.API_URL ?? "http://localhost:3001"

test("GET /health reports the API is up", async ({ request }) => {
  const res = await request.get(`${API_URL}/health`)
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(body).toMatchObject({ status: "ok", service: "aether-api" })
})
