import { test, expect } from "@playwright/test"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test.use({ storageState: path.join(__dirname, "../.auth/binder.json") })

// Los tests comparten estado del run/energía del binder — corren en serie.
test.describe.configure({ mode: "serial" })

const MONGO_URI =
  process.env.E2E_MONGODB_URI ?? "mongodb://root:root@localhost:27017/aether?authSource=admin"

/**
 * La Espiral: flujo completo del minijuego PvE.
 * El binder e2e nace sin entidades (equipo requiere 3), así que el primer
 * test siembra 3 entidades del catálogo + 100 Ecos directamente en Mongo —
 * mismo rol que tendría un fixture de servidor.
 */
test.describe("La Espiral — tower run flow", () => {
  test("seed: grant a team of 3 entities and 100 ecos", async ({ page }) => {
    // clerkId del binder e2e, expuesto por Clerk en el cliente
    await page.goto("/")
    await page.waitForFunction(() => Boolean((window as any).Clerk?.user?.id), null, {
      timeout: 30_000,
    })
    const clerkId = await page.evaluate(() => (window as any).Clerk.user.id as string)
    expect(clerkId).toBeTruthy()

    const { MongoClient } = await import("mongodb")
    const client = new MongoClient(MONGO_URI)
    try {
      await client.connect()
      const db = client.db("aether")

      // Esperar a que el perfil se auto-provisione en Mongo (ocurre en el
      // primer GET /user/profile autenticado que dispara MasterLayout)
      await expect
        .poll(async () => db.collection("users").countDocuments({ clerkId }), {
          timeout: 30_000,
        })
        .toBe(1)

      const catalog = await db.collection("entities").find({}).limit(3).toArray()
      expect(catalog.length).toBeGreaterThanOrEqual(3)

      await db.collection("user_entities").insertMany(
        catalog.map((entity) => ({
          entityId: entity._id,
          ownerId: clerkId,
          obtainedAt: new Date(),
          obtainedVia: "gacha" as const,
        }))
      )
      const updated = await db.collection("users").updateOne({ clerkId }, { $set: { ecos: 100 } })
      expect(updated.matchedCount).toBe(1)
    } finally {
      await client.close()
    }
  })

  test("descend floor 1: team select, combat playback, victory", async ({ page }) => {
    await page.goto("/espiral")
    await expect(page.getByRole("heading", { name: /la espiral/i })).toBeVisible({
      timeout: 30_000,
    })

    // Hub: energía llena del binder recién forjado
    await expect(page.getByText("10/10")).toBeVisible({ timeout: 20_000 })

    await page.getByRole("button", { name: /iniciar descenso/i }).click()
    await expect(page.getByText(/elige 3 entidades/i)).toBeVisible({ timeout: 15_000 })

    // Seleccionar las 3 entidades sembradas
    const cards = page.getByTestId("entity-pick-card")
    await expect(cards.first()).toBeVisible({ timeout: 15_000 })
    for (let i = 0; i < 3; i++) await cards.nth(i).click()

    await page.getByRole("button", { name: /descender \(3\/3\)/i }).click()

    // Combate del piso 1 en reproducción — saltar el playback
    const skip = page.getByRole("button", { name: /saltar/i })
    await expect(skip).toBeVisible({ timeout: 30_000 })
    await skip.click()

    // Cualquier equipo supera el piso 1 (curva de escalado determinística)
    await expect(page.getByRole("heading", { name: /piso 1 superado/i })).toBeVisible({
      timeout: 30_000,
    })
  })

  test("retreat banks the run and returns to hub with 9/10 energy", async ({ page }) => {
    await page.goto("/espiral")

    // El run sigue activo (piso 2) — continuar y retirarse desde el aftermath
    const continueBtn = page.getByRole("button", { name: /continuar descenso — piso 2/i })
    await expect(continueBtn).toBeVisible({ timeout: 30_000 })
    await continueBtn.click()

    const skip = page.getByRole("button", { name: /saltar/i })
    await expect(skip).toBeVisible({ timeout: 30_000 })
    await skip.click()

    // Piso 2 también es victoria prácticamente segura; retirarse banca el run
    await expect(page.getByRole("heading", { name: /piso 2 superado/i })).toBeVisible({
      timeout: 30_000,
    })
    await page.getByRole("button", { name: /retirarse y bancar/i }).click()

    // De vuelta en el hub sin run activo y con la energía gastada (1 de 10)
    await expect(page.getByRole("button", { name: /iniciar descenso/i })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText("9/10")).toBeVisible({ timeout: 20_000 })
  })

  test("manual mode: action bar drives a turn-based floor to victory", async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto("/espiral")
    await expect(page.getByRole("button", { name: /iniciar descenso/i })).toBeVisible({
      timeout: 30_000,
    })

    // Activar combate manual — el click puede llegar antes de la hidratación
    // de React (mismo patrón que global.setup), así que verificar y reintentar.
    await expect(async () => {
      await page.getByTestId("combat-mode-manual").click()
      await expect(page.getByTestId("combat-mode-manual")).toHaveAttribute("aria-pressed", "true", {
        timeout: 1_500,
      })
    }).toPass({ timeout: 20_000 })

    await page.getByRole("button", { name: /iniciar descenso/i }).click()
    await expect(page.getByText(/elige 3 entidades/i)).toBeVisible({ timeout: 15_000 })

    const cards = page.getByTestId("entity-pick-card")
    await expect(cards.first()).toBeVisible({ timeout: 15_000 })
    for (let i = 0; i < 3; i++) await cards.nth(i).click()
    await page.getByRole("button", { name: /descender \(3\/3\)/i }).click()

    // La barra de acciones aparece cuando toca decidir
    const actionBar = page.getByTestId("combat-action-bar")
    await expect(actionBar).toBeVisible({ timeout: 30_000 })

    // Atacar en cada turno hasta superar el piso (equipo sembrado vs piso bajo).
    // La barra se oculta durante el playback y el botón se deshabilita mientras
    // la acción viaja — clicks cortos con reintento en vez de un click bloqueante.
    const victory = page.getByRole("heading", { name: /piso \d+ superado/i })
    for (let turn = 0; turn < 60; turn++) {
      if (await victory.isVisible().catch(() => false)) break
      await page
        .getByTestId("action-attack")
        .click({ timeout: 3_000 })
        .catch(() => {}) // playback en curso o botón deshabilitado — reintentar
      await page.waitForTimeout(500)
    }

    await expect(page.getByRole("heading", { name: /piso \d+ superado/i })).toBeVisible({
      timeout: 30_000,
    })

    // Bancar el run para dejar estado limpio (y volver al modo auto por defecto)
    await page.getByRole("button", { name: /retirarse y bancar/i }).click()
    await expect(page.getByRole("button", { name: /iniciar descenso/i })).toBeVisible({
      timeout: 30_000,
    })
    await page.getByTestId("combat-mode-auto").click()
  })

  test("altar del eco: pull x1 with seeded ecos reveals an entity", async ({ page }) => {
    await page.goto("/altar-eco")
    await expect(page.getByRole("heading", { name: /altar del eco/i })).toBeVisible({
      timeout: 30_000,
    })

    // \s tras ×1 evita el choque con "Invocar ×10" (mismo truco que el spec del gacha)
    const pullX1 = page.getByRole("button", { name: /invocar ×1\s/i })
    await expect(pullX1).toBeEnabled({ timeout: 20_000 })
    await pullX1.click()

    // Reveal reutiliza EntityReveal del Altar principal
    const continuar = page.getByRole("button", { name: /continuar/i })
    await expect(continuar).toBeVisible({ timeout: 60_000 })
    await continuar.click()

    // De vuelta en el Altar del Eco
    await expect(page.getByRole("heading", { name: /altar del eco/i })).toBeVisible({
      timeout: 20_000,
    })
  })
})
