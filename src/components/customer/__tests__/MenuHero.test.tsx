import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MenuHero } from "@/components/customer/MenuHero"

function setup(overrides: { query?: string; resultCount?: number } = {}) {
  const props = {
    query: "",
    onQueryChange: vi.fn(),
    ...overrides,
  }
  render(<MenuHero {...props} />)
  return props
}

describe("MenuHero", () => {
  it("renderiza eyebrow, título display e subtítulo", () => {
    setup()
    expect(screen.getByText("Cardápio")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Escolha seus cookies" })).toBeInTheDocument()
    expect(screen.getByText("Retirada na loja — monte seu pedido")).toBeInTheDocument()
  })

  it("chama onQueryChange ao digitar na busca", async () => {
    const user = userEvent.setup()
    const props = setup()
    await user.type(screen.getByLabelText("Buscar no cardápio"), "choc")
    expect(props.onQueryChange).toHaveBeenCalledTimes(4)
  })

  it("não mostra contagem quando a busca está vazia", () => {
    setup({ query: "", resultCount: 3 })
    expect(screen.queryByText(/itens encontrados/i)).not.toBeInTheDocument()
  })

  it("mostra contagem singular quando há 1 resultado", () => {
    setup({ query: "choc", resultCount: 1 })
    expect(screen.getByText("1 item encontrado")).toBeInTheDocument()
  })

  it("mostra contagem plural quando há vários resultados", () => {
    setup({ query: "choc", resultCount: 4 })
    expect(screen.getByText("4 itens encontrados")).toBeInTheDocument()
  })

  it("mostra botão de limpar busca quando há query e o click limpa", async () => {
    const user = userEvent.setup()
    const props = setup({ query: "choc" })
    await user.click(screen.getByRole("button", { name: /limpar busca/i }))
    expect(props.onQueryChange).toHaveBeenCalledWith("")
  })
})
