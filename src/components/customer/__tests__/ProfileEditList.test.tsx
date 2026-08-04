import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProfileEditList } from "@/components/customer/ProfileEditList"

const fields = [
  { label: "Nome", name: "name", value: "Ana", onChange: vi.fn() },
  { label: "Telefone", name: "phone", value: "(11) 99999-9999", onChange: vi.fn() },
]

describe("ProfileEditList", () => {
  it("renders all fields", () => {
    render(
      <ProfileEditList fields={fields} onCancel={vi.fn()} onSave={vi.fn()} saving={false} />,
    )
    expect(screen.getByLabelText("Nome")).toBeInTheDocument()
    expect(screen.getByLabelText("Telefone")).toBeInTheDocument()
  })

  it("renders cancel and save buttons", () => {
    render(
      <ProfileEditList fields={fields} onCancel={vi.fn()} onSave={vi.fn()} saving={false} />,
    )
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument()
  })

  it("calls onSave when save button is clicked", async () => {
    const onSave = vi.fn()
    render(
      <ProfileEditList fields={fields} onCancel={vi.fn()} onSave={onSave} saving={false} />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it("calls onCancel when cancel button is clicked", async () => {
    const onCancel = vi.fn()
    render(
      <ProfileEditList fields={fields} onCancel={onCancel} onSave={vi.fn()} saving={false} />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("disables buttons when saving", () => {
    render(
      <ProfileEditList fields={fields} onCancel={vi.fn()} onSave={vi.fn()} saving={true} />,
    )
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled()
  })

  it("accepts custom save label", () => {
    render(
      <ProfileEditList fields={fields} onCancel={vi.fn()} onSave={vi.fn()} saving={false} saveLabel="Guardar" />,
    )
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument()
  })
})