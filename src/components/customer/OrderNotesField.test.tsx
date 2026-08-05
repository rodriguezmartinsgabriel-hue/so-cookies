import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OrderNotesField } from "./OrderNotesField"

describe("OrderNotesField", () => {
  it("renderiza o campo de observações", () => {
    render(<OrderNotesField value="" onChange={() => {}} />)
    expect(screen.getByText("Observações")).toBeInTheDocument()
  })

  it("conta caracteres restantes", async () => {
    render(<OrderNotesField value="" onChange={() => {}} />)
    expect(screen.getByText("(200 restantes)")).toBeInTheDocument()
  })

  it("limita a 200 caracteres", async () => {
    const onChange = () => {}
    render(<OrderNotesField value="" onChange={onChange} />)
    await userEvent.click(screen.getByRole("button", { name: /observações/i }))
    const textarea = screen.getByRole("textbox")
    expect(textarea).toHaveAttribute("maxLength", "200")
  })

  it("exibe aviso quando restam menos de 50 caracteres", async () => {
    const onChange = () => {}
    const longValue = "a".repeat(160)
    render(<OrderNotesField value={longValue} onChange={onChange} />)
    await userEvent.click(screen.getByRole("button", { name: /observações/i }))
    expect(screen.getByText(/40 restantes/)).toBeInTheDocument()
  })
})