import { test, expect, devices } from "@playwright/test"

const pixel = { ...devices["Pixel 7"] }
delete (pixel as Record<string, unknown>).defaultBrowserType

test.describe("Prompt mobile de instalação do app", () => {
  test.setTimeout(60000)
  test.use(pixel)

  test("aparece automaticamente para cliente mobile na primeira visita", async ({ page }) => {
    await page.goto("/cardapio")
    await expect(page.getByRole("heading", { name: /instale o app da só/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /instalar app/i })).toBeVisible()
  })

  test("“Agora não” fecha o modal e não reaparece na mesma visita", async ({ page }) => {
    await page.goto("/cardapio")
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await page.getByRole("button", { name: /agora não/i }).click()
    await expect(dialog).toBeHidden()
    await page.reload()
    await expect(dialog).toBeHidden()
  })

  test("exibe instruções de instalação ao tocar em Instalar app", async ({ page }) => {
    await page.goto("/cardapio")
    await expect(page.getByRole("button", { name: /instalar app/i })).toBeVisible()
    await page.getByRole("button", { name: /instalar app/i }).click()
    await expect(page.getByText(/menu do navegador/i)).toBeVisible()
  })
})
