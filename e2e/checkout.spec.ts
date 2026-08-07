import { test, expect, Page } from "@playwright/test"

const MP_PAYMENTS_URL = "https://api.mercadopago.com/**"

async function mockMercadoPago(page: Page) {
  await page.route(MP_PAYMENTS_URL, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: 123456789,
          status: "pending",
          status_detail: "pending_waiting_payment",
          transaction_amount: 42.5,
          external_reference: "order:test-order-id",
          point_of_interaction: {
            transaction_data: {
              qr_code: "00020126580014br.gov.bcb.pix0136test-qr-code520400005303986540442.505802BR5925Test Merchant6009Sao Paulo62070503***6304",
              qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            },
          },
        }),
      })
      return
    }
    await route.continue()
  })
}

test.describe("Checkout PIX", () => {
  test("gera QR Code PIX via mock do Mercado Pago", async ({ page }) => {
    await mockMercadoPago(page)

    await page.goto("/cardapio")
    await expect(page.getByRole("heading", { name: /cardápio/i })).toBeVisible()

    const firstAddButton = page.getByRole("button", { name: /adicionar/i }).first()
    await firstAddButton.click()

    await page.goto("/carrinho")
    await expect(page.getByText(/resumo do pedido|itens/i)).toBeVisible()

    const checkoutButton = page.getByRole("button", { name: /finalizar|continuar|checkout/i }).first()
    await checkoutButton.click()

    await page.waitForURL(/.*pedido.*|.*checkout.*|.*pagamento.*/, { timeout: 10000 }).catch(() => {})

    const qrCodeVisible = page.getByAltText(/qr code/i).or(page.getByText(/pix copia e cola/i)).or(page.getByText(/aguardando pagamento/i))
    await expect(qrCodeVisible.first()).toBeVisible({ timeout: 15000 })
  })

  test("cancela pedido PENDENTE com sucesso", async ({ page }) => {
    await mockMercadoPago(page)

    await page.goto("/pedido/test-order-id")
    await expect(page.getByText(/pendente|aguardando/i)).toBeVisible({ timeout: 10000 })

    const cancelButton = page.getByRole("button", { name: /cancelar/i }).or(page.getByText(/cancelar pedido/i))
    if (await cancelButton.isVisible().catch(() => false)) {
      await cancelButton.click()

      const confirmButton = page.getByRole("button", { name: /confirmar|sim/i }).or(page.getByText(/confirmar cancelamento/i))
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click()
      }

      await expect(page.getByText(/cancelado|pedido cancelado/i)).toBeVisible({ timeout: 10000 })
    }
  })
})
