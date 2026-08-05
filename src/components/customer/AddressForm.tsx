"use client"

import { type ChangeEvent } from "react"
import { FormField } from "@/components/ui/FormField"
import { Input } from "@/components/ui/Input"
import type { AddressState } from "@/lib/customer-types"

type AddressFormProps = {
  address: AddressState
  onChange: (address: AddressState) => void
  disabled?: boolean
  showOptionalFields?: boolean
}

export function AddressForm({ address, onChange, disabled = false, showOptionalFields = true }: AddressFormProps) {
  const handleChange = (key: keyof AddressState) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    onChange({ ...address, [key]: value })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <FormField label="CEP" htmlFor="cep" required>
            <Input
              id="cep"
              type="tel"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              value={address.cep}
              onChange={handleChange("cep")}
              disabled={disabled}
            />
          </FormField>
        </div>

        <div className="col-span-2">
          <FormField label="Cidade" htmlFor="city" required>
            <Input
              id="city"
              type="text"
              autoComplete="address-level2"
              value={address.city}
              onChange={handleChange("city")}
              disabled={disabled}
            />
          </FormField>
        </div>
      </div>

      <FormField label="Rua" htmlFor="street" required>
        <Input
          id="street"
          type="text"
          autoComplete="address-line1"
          value={address.street}
          onChange={handleChange("street")}
          disabled={disabled}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-2">
        <FormField label="Número" htmlFor="number" required>
          <Input
            id="number"
            type="text"
            autoComplete="address-line2"
            value={address.number}
            onChange={handleChange("number")}
            disabled={disabled}
          />
        </FormField>

        <FormField label="Complemento" htmlFor="complement">
          <Input
            id="complement"
            type="text"
            autoComplete="address-line2"
            value={address.complement}
            onChange={handleChange("complement")}
            disabled={disabled}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <FormField label="Bairro" htmlFor="neighborhood">
            <Input
              id="neighborhood"
              type="text"
              autoComplete="address-level3"
              value={address.neighborhood}
              onChange={handleChange("neighborhood")}
              disabled={disabled}
            />
          </FormField>
        </div>

        <FormField label="UF" htmlFor="state" required>
          <Input
            id="state"
            type="text"
            maxLength={2}
            autoComplete="address-level1"
            placeholder="SP"
            value={address.state}
            onChange={handleChange("state")}
            disabled={disabled}
          />
        </FormField>
      </div>
    </div>
  )
}
