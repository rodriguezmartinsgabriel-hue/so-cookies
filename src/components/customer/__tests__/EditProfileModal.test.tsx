import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EditProfileModal } from "@/components/customer/EditProfileModal"

afterEach(() => {
  document.body.style.overflow = ""
})

const EMPTY = {
  name: "",
  phone: null,
  address: {
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  },
}

const FILLED = {
  name: "Ana Silva",
  phone: "(11) 99999-9999",
  address: {
    cep: "01310-100",
    street: "Av. Paulista",
    number: "1000",
    complement: "Apto 12",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  },
}

describe("EditProfileModal", () => {
  it("não renderiza quando open=false", () => {
    render(<EditProfileModal open={false} onClose={vi.fn()} initial={FILLED} onSubmit={vi.fn()} />)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("renderiza seções 'Dados pessoais' e 'Endereço de entrega'", () => {
    render(<EditProfileModal open onClose={vi.fn()} initial={FILLED} onSubmit={vi.fn()} />)
    expect(screen.getByText(/Dados pessoais/i)).toBeInTheDocument()
    expect(screen.getByText(/Endereço de entrega/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Nome/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Telefone/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^CEP/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Cidade/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Rua/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Número/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Complemento/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Bairro/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^UF/)).toBeInTheDocument()
  })

  it("preenche campos com initial", () => {
    render(<EditProfileModal open onClose={vi.fn()} initial={FILLED} onSubmit={vi.fn()} />)
    expect((screen.getByLabelText(/^Nome/) as HTMLInputElement).value).toBe("Ana Silva")
    expect((screen.getByLabelText(/^Telefone/) as HTMLInputElement).value).toBe("(11) 99999-9999")
    expect((screen.getByLabelText(/^CEP/) as HTMLInputElement).value).toBe("01310-100")
    expect((screen.getByLabelText(/^UF/) as HTMLInputElement).value).toBe("SP")
  })

  it("botão Salvar desabilitado enquanto requireds vazios", () => {
    render(<EditProfileModal open onClose={vi.fn()} initial={EMPTY} onSubmit={vi.fn()} />)
    expect(screen.getByRole("button", { name: /Salvar alterações/i })).toBeDisabled()
  })

  it("botão Salvar habilita quando todos requireds preenchidos", async () => {
    render(<EditProfileModal open onClose={vi.fn()} initial={EMPTY} onSubmit={vi.fn()} />)
    await userEvent.type(screen.getByLabelText(/^Nome/), "Maria")
    await userEvent.type(screen.getByLabelText(/^CEP/), "01310-100")
    await userEvent.type(screen.getByLabelText(/^Cidade/), "São Paulo")
    await userEvent.type(screen.getByLabelText(/^Rua/), "Av. Paulista")
    await userEvent.type(screen.getByLabelText(/^Número/), "1000")
    await userEvent.type(screen.getByLabelText(/^UF/), "SP")
    expect(screen.getByRole("button", { name: /Salvar alterações/i })).not.toBeDisabled()
  })

  it("chama onSubmit com dados normalizados (trim, UF uppercase, phone null se vazio)", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<EditProfileModal open onClose={vi.fn()} initial={EMPTY} onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText(/^Nome/), "  Ana Silva  ")
    await userEvent.type(screen.getByLabelText(/^Telefone/), "  ")
    await userEvent.type(screen.getByLabelText(/^CEP/), " 01310-100 ")
    await userEvent.type(screen.getByLabelText(/^Cidade/), " São Paulo ")
    await userEvent.type(screen.getByLabelText(/^Rua/), " Av. Paulista ")
    await userEvent.type(screen.getByLabelText(/^Número/), " 1000 ")
    await userEvent.type(screen.getByLabelText(/^UF/), "sp")
    await userEvent.click(screen.getByRole("button", { name: /Salvar alterações/i }))
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Ana Silva",
      phone: null,
      address: {
        cep: "01310-100",
        street: "Av. Paulista",
        number: "1000",
        complement: "",
        neighborhood: "",
        city: "São Paulo",
        state: "SP",
      },
    })
  })

  it("mostra erro quando onSubmit lança", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Falha ao salvar"))
    render(<EditProfileModal open onClose={vi.fn()} initial={FILLED} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole("button", { name: /Salvar alterações/i }))
    expect(await screen.findByText("Falha ao salvar")).toBeInTheDocument()
  })

  it("chama onClose ao clicar em Cancelar", async () => {
    const onClose = vi.fn()
    render(<EditProfileModal open onClose={onClose} initial={FILLED} onSubmit={vi.fn()} />)
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("reseta os campos quando initial muda após open", async () => {
    const { rerender } = render(
      <EditProfileModal open onClose={vi.fn()} initial={FILLED} onSubmit={vi.fn()} />,
    )
    expect((screen.getByLabelText(/^Nome/) as HTMLInputElement).value).toBe("Ana Silva")
    rerender(
      <EditProfileModal
        open
        onClose={vi.fn()}
        initial={{ ...EMPTY, name: "João" }}
        onSubmit={vi.fn()}
      />,
    )
    expect((screen.getByLabelText(/^Nome/) as HTMLInputElement).value).toBe("João")
  })
})
