import { test, expect } from "@playwright/test"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test.use({ storageState: path.join(__dirname, "../.auth/binder.json") })

// Los tres tests comparten estado del usuario (saldo tras la invocación),
// así que corren en serie dentro del mismo worker.
test.describe.configure({ mode: "serial" })

// H-05..H-08: flujo completo de invocación gacha desde el Altar.
// El binder e2e nace con 320 Shards → una invocación x1 (160) debe funcionar
// y dejar el saldo exactamente en 160 (costos determinísticos).
test.describe("Gacha invocation flow", () => {
  test("invoke x1 spends 160 shards and reveals an entity", async ({ page }) => {
    await page.goto("/")

    // El Altar muestra el saldo inicial del binder recién forjado
    await expect(page.getByText("Saldo: ◈ 320")).toBeVisible({ timeout: 30_000 })

    const invokeX1 = page.getByRole("button", { name: /invocar x1\s/i })
    await expect(invokeX1).toBeEnabled({ timeout: 20_000 })
    await invokeX1.click()

    // La secuencia de revelado muestra la entidad obtenida con su CTA
    const continuar = page.getByRole("button", { name: /continuar/i })
    await expect(continuar).toBeVisible({ timeout: 60_000 })
    await continuar.click()

    // De vuelta en el Altar, el saldo refleja el gasto de 160
    await expect(page.getByText("Saldo: ◈ 160")).toBeVisible({ timeout: 30_000 })
  })

  test("x10 button is disabled without enough shards", async ({ page }) => {
    await page.goto("/")
    // Tras gastar 160 quedan 160 < 1,600 → x10 debe estar deshabilitado
    await expect(page.getByText("Saldo: ◈ 160")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("button", { name: /invocar x10/i })).toBeDisabled()
  })

  test("obtained entity appears in the collection", async ({ page }) => {
    await page.goto("/collection")
    await expect(page.getByRole("heading", { name: /colección/i })).toBeVisible({
      timeout: 20_000,
    })
    // La invocación anterior dejó al menos una carta en la colección
    await expect(page.locator("img").first()).toBeVisible({ timeout: 15_000 })
  })
})
