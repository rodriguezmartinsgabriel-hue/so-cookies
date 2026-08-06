import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { AddressForm } from "./AddressForm"
import { EMPTY_ADDRESS } from "@/lib/customer-types"

describe("AddressForm", () => {
  it("renderiza todos os campos", () => {
    render(<AddressForm address={EMPTY_ADDRESS} onChange={() => {}} />)
    expect(screen.getByLabelText(/CEP/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Cidade/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Rua/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Número/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Complemento/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Bairro/)).toBeInTheDocument()
    expect(screen.getByLabelText(/UF/)).toBeInTheDocument()
  })

  it("passa disabled para os inputs", () => {
    render(<AddressForm address={EMPTY_ADDRESS} onChange={() => {}} disabled />)
    expect(screen.getByLabelText(/CEP/)).toBeDisabled()
  })
})
