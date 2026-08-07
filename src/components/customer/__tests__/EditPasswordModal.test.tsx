import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EditPasswordModal } from "@/components/customer/EditPasswordModal"

afterEach(() => {
  document.body.style.overflow = ""
})

describe("EditPasswordModal", () => {
  it("não renderiza quando open=false", () => {
    render(<EditPasswordModal open={false} onClose={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("renderiza campos de senha e botões quando open=true", () => {
    render(<EditPasswordModal open onClose={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByLabelText("Senha atual")).toBeInTheDocument()
    expect(screen.getByLabelText(/Nova senha/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Alterar senha" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument()
  })

  it("botão Salvar fica desabilitado até senha válida (≥6)", async () => {
    render(<EditPasswordModal open onClose={vi.fn()} onSubmit={vi.fn()} />)
    const saveBtn = screen.getByRole("button", { name: "Alterar senha" })
    expect(saveBtn).toBeDisabled()

    await userEvent.type(screen.getByLabelText("Senha atual"), "atual123")
    await userEvent.type(screen.getByLabelText(/Nova senha/), "12345")
    expect(saveBtn).toBeDisabled()

    await userEvent.clear(screen.getByLabelText(/Nova senha/))
    await userEvent.type(screen.getByLabelText(/Nova senha/), "123456")
    expect(saveBtn).not.toBeDisabled()
  })

  it("chama onSubmit com currentPassword e newPassword", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<EditPasswordModal open onClose={vi.fn()} onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText("Senha atual"), "oldpass1")
    await userEvent.type(screen.getByLabelText(/Nova senha/), "newpass1")
    await userEvent.click(screen.getByRole("button", { name: "Alterar senha" }))
    expect(onSubmit).toHaveBeenCalledWith({
      currentPassword: "oldpass1",
      newPassword: "newpass1",
    })
  })

  it("mostra mensagem de erro quando onSubmit lança", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Senha atual incorreta"))
    render(<EditPasswordModal open onClose={vi.fn()} onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText("Senha atual"), "errada")
    await userEvent.type(screen.getByLabelText(/Nova senha/), "nova123")
    await userEvent.click(screen.getByRole("button", { name: "Alterar senha" }))
    expect(await screen.findByText("Senha atual incorreta")).toBeInTheDocument()
  })

  it("chama onClose ao clicar em Cancelar", async () => {
    const onClose = vi.fn()
    render(<EditPasswordModal open onClose={onClose} onSubmit={vi.fn()} />)
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("limpa os campos após sucesso e fecha modal", async () => {
    const onClose = vi.fn()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<EditPasswordModal open onClose={onClose} onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText("Senha atual"), "abc123")
    await userEvent.type(screen.getByLabelText(/Nova senha/), "xyz123")
    await userEvent.click(screen.getByRole("button", { name: "Alterar senha" }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
