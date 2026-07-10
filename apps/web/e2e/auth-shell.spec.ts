import { test, expect } from "@playwright/test"

// H-01: registro/inicio de sesion — cubre el shell de auth que ve todo
// visitante no autenticado, sin depender de credenciales reales de Clerk.

test.describe("Unauthenticated shell", () => {
  test("shows the sign-in form with the game's branding", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("Aether Gacha")).toBeVisible()
    await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /entrar al altar/i })).toBeVisible()
  })

  test("toggling to sign-up shows the registration form", async ({ page }) => {
    await page.goto("/")
    // El click puede llegar antes de que React hidrate el shell SSR; se
    // reintenta hasta que el toggle surta efecto.
    await expect(async () => {
      await page.getByRole("button", { name: /crear cuenta/i }).click()
      await expect(page.getByRole("heading", { name: /crear cuenta/i })).toBeVisible({
        timeout: 2_000,
      })
    }).toPass({ timeout: 15_000 })
    await expect(page.getByPlaceholder("binder_name")).toBeVisible()
  })

  test("any route redirects to the same auth shell when signed out", async ({ page }) => {
    await page.goto("/bazaar")
    await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible()
  })
})
