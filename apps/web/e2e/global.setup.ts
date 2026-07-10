import { test as setup, expect } from "@playwright/test"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const AUTH_STATE = path.join(__dirname, ".auth/binder.json")

// Registra un Aether Binder nuevo por corrida usando la convención de emails de
// prueba de Clerk (+clerk_test → OTP fijo 424242, solo instancias development).
// Un usuario fresco garantiza estado determinístico: 320 Shards, pity 0,
// inventario vacío. Los specs de UI reusan la sesión vía storageState.
setup("register a fresh e2e binder", async ({ page }) => {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
  const username = `e2e_${suffix}`
  const email = `e2e_${suffix}+clerk_test@example.com`
  const password = "AetherE2E!12345"

  await page.goto("/")

  // El click puede llegar antes de la hidratación de React — reintentar.
  await expect(async () => {
    await page.getByRole("button", { name: /crear cuenta/i }).click()
    await expect(page.getByRole("heading", { name: /crear cuenta/i })).toBeVisible({
      timeout: 2_000,
    })
  }).toPass({ timeout: 20_000 })

  await page.getByPlaceholder("binder_name").fill(username)
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill(password)
  await page.getByLabel("Confirmar Contraseña").fill(password)
  await page.getByRole("button", { name: /forjar mi binder/i }).click()

  // Paso 2: código de verificación fijo de Clerk para emails +clerk_test
  await expect(page.getByRole("heading", { name: /verificar email/i })).toBeVisible({
    timeout: 15_000,
  })
  await page.getByLabel(/código de verificación/i).fill("424242")
  await page.getByRole("button", { name: /verificar y entrar/i }).click()

  // Sesión activa: la navegación del juego autenticado es visible
  await expect(page.getByRole("link", { name: /el bazar/i })).toBeVisible({ timeout: 20_000 })

  await page.context().storageState({ path: AUTH_STATE })
})
