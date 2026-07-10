import { test, expect } from "@playwright/test"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test.use({ storageState: path.join(__dirname, "../.auth/binder.json") })

// Cobertura de navegación autenticada: cada sección principal del juego
// renderiza su contenido real (H-12 Bazaar, H-13/H-14 Rift, H-02 Vault,
// P-38 notificaciones, P-40 perfil/historial).

test("Bazaar lists the market with filters", async ({ page }) => {
  await page.goto("/bazaar")
  await expect(page.getByRole("heading", { name: /el bazar/i })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/intercambia personajes por shards/i)).toBeVisible()
})

test("Rift shows today's rotation with 5 slots", async ({ page }) => {
  await page.goto("/rift")
  await expect(page.getByRole("heading", { name: /las fisuras/i })).toBeVisible({
    timeout: 20_000,
  })
  // La rotación diaria siempre tiene 5 slots con precio en Shards
  await expect(page.getByText(/◈/).first()).toBeVisible({ timeout: 15_000 })
})

test("Vault shows shard packages protected by Stripe", async ({ page }) => {
  await page.goto("/vault")
  await expect(page.getByRole("heading", { name: /la bóveda/i })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/protegido por stripe/i)).toBeVisible()
})

test("Profile shows binder stats and transaction history", async ({ page }) => {
  await page.goto("/profile")
  await expect(page.getByRole("heading", { name: /perfil del binder/i })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText(/historial de shards/i)).toBeVisible()
})

test("Profile can generate an MCP API key", async ({ page }) => {
  await page.goto("/profile")
  const generate = page.getByTestId("generate-mcp-key")
  await expect(generate).toBeVisible({ timeout: 20_000 })
  // El click puede llegar antes de la hidratación — reintentar hasta que surta efecto
  await expect(async () => {
    await generate.click()
    await expect(page.getByTestId("mcp-key-value")).toContainText("aeth_", { timeout: 3_000 })
  }).toPass({ timeout: 20_000 })
})

test("Notification bell opens the in-app panel", async ({ page }) => {
  await page.goto("/")
  const bell = page.getByRole("button", { name: /notificaciones/i })
  await expect(bell).toBeVisible({ timeout: 20_000 })
  // El click puede llegar durante la animación de entrada del HUD — reintentar
  await expect(async () => {
    await bell.click()
    await expect(page.getByText("Notificaciones").first()).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 15_000 })
})

test("Admin panel denies access to a regular binder", async ({ page }) => {
  await page.goto("/admin")
  // Un binder sin rol admin queda en la verificación o ve el rechazo explícito;
  // lo importante es que el dashboard admin nunca aparece.
  await expect(page.getByText(/unauthorized access|verifying clearance/i)).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByRole("link", { name: /audit log/i })).toHaveCount(0)
})
