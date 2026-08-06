import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OrderConfirmDialog } from "./OrderConfirmDialog"
import type { CatalogProduct } from "@/lib/utils"

const mockProduct: CatalogProduct = {
  id: "1",
  name: "Cookie Chocolate",
  category: "Cookies",
  price: 5.0,
  unit: "un",
  image: null,
  description: null,
  nutrition: null,
}

const mockLines = [{ productId: "1", qty: 2, product: mockProduct }]

describe("OrderConfirmDialog", () => {
  it("renderiza com resumo dos itens", () => {
    render(
      <OrderConfirmDialog
        lines={mockLines}
        mode="retirada"
        selectedSlot={null}
        address={null}
        couponCode=""
        discountTotal={undefined}
        total={10}
        onConfirm={() => {}}
        onCancel={() => {}}
        loading={false}
      />,
    )
    expect(screen.getByRole("heading", { name: "Confirmar pedido" })).toBeInTheDocument()
  })

  it("chama onConfirm ao clicar no botão Confirmar", async () => {
    const onConfirm = () => {}
    render(
      <OrderConfirmDialog
        lines={mockLines}
        mode="retirada"
        selectedSlot={null}
        address={null}
        couponCode=""
        discountTotal={undefined}
        total={10}
        onConfirm={onConfirm}
        onCancel={() => {}}
        loading={false}
      />,
    )
    const confirmBtn = screen.getByRole("button", { name: /confirmar pedido/i })
    await userEvent.click(confirmBtn)
  })

  it("chama onCancel ao clicar em Voltar", async () => {
    const onCancel = () => {}
    render(
      <OrderConfirmDialog
        lines={mockLines}
        mode="retirada"
        selectedSlot={null}
        address={null}
        couponCode=""
        discountTotal={undefined}
        total={10}
        onConfirm={() => {}}
        onCancel={onCancel}
        loading={false}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /voltar/i }))
  })

  it("desabilita botões quando loading", () => {
    render(
      <OrderConfirmDialog
        lines={mockLines}
        mode="retirada"
        selectedSlot={null}
        address={null}
        couponCode=""
        discountTotal={undefined}
        total={10}
        onConfirm={() => {}}
        onCancel={() => {}}
        loading={true}
      />,
    )
    expect(screen.getByText("Finalizando...")).toBeInTheDocument()
  })
})
