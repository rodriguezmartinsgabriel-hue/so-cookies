"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { FormField } from "@/components/ui/FormField"
import type { AddressState } from "@/lib/customer-types"

export type EditProfileInput = {
  name: string
  phone: string | null
  address: AddressState
}

type EditProfileModalProps = {
  open: boolean
  onClose: () => void
  initial: EditProfileInput
  onSubmit: (input: EditProfileInput) => Promise<void>
}

type FormState = {
  name: string
  phone: string
  address: AddressState
}

function toFormState(initial: EditProfileInput): FormState {
  return {
    name: initial.name,
    phone: initial.phone ?? "",
    address: { ...initial.address },
  }
}

export function EditProfileModal({ open, onClose, initial, onSubmit }: EditProfileModalProps) {
  const [prevOpen, setPrevOpen] = useState(open)
  const [prevInitial, setPrevInitial] = useState(initial)
  const [form, setForm] = useState<FormState>(() => toFormState(initial))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (open !== prevOpen || initial !== prevInitial) {
    setPrevOpen(open)
    setPrevInitial(initial)
    setForm(toFormState(initial))
    setError(null)
    setSaving(false)
  }

  const { name, phone, address } = form

  function setField<K extends keyof AddressState>(key: K, value: AddressState[K]) {
    setForm((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }))
  }

  const requiredOk =
    name.trim().length > 0 &&
    address.cep.trim().length > 0 &&
    address.city.trim().length > 0 &&
    address.street.trim().length > 0 &&
    address.number.trim().length > 0 &&
    address.state.trim().length === 2

  function handleClose() {
    if (saving) return
    onClose()
  }

  async function handleSubmit() {
    if (!requiredOk) {
      setError("Preencha nome, CEP, cidade, rua, número e UF.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim() ? phone.trim() : null,
        address: {
          cep: address.cep.trim(),
          street: address.street.trim(),
          number: address.number.trim(),
          complement: address.complement.trim(),
          neighborhood: address.neighborhood.trim(),
          city: address.city.trim(),
          state: address.state.trim().toUpperCase(),
        },
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar os dados.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Editar dados e endereço"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="md" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!requiredOk || saving}>
            {saving ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      }
    >
      <div className="p-5 space-y-5">
        <section className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted font-semibold">
            Dados pessoais
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Nome" htmlFor="edit-name" required>
              <Input
                id="edit-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                disabled={saving}
              />
            </FormField>
            <FormField label="Telefone" htmlFor="edit-phone">
              <Input
                id="edit-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                disabled={saving}
              />
            </FormField>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted font-semibold">
            Endereço de entrega
          </p>
          <div className="grid grid-cols-3 gap-2">
            <FormField label="CEP" htmlFor="edit-cep" required>
              <Input
                id="edit-cep"
                type="tel"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                value={address.cep}
                onChange={(e) => setField("cep", e.target.value)}
                disabled={saving}
              />
            </FormField>
            <div className="col-span-2">
              <FormField label="Cidade" htmlFor="edit-city" required>
                <Input
                  id="edit-city"
                  type="text"
                  autoComplete="address-level2"
                  value={address.city}
                  onChange={(e) => setField("city", e.target.value)}
                  disabled={saving}
                />
              </FormField>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <FormField label="Rua" htmlFor="edit-street" required>
                <Input
                  id="edit-street"
                  type="text"
                  autoComplete="address-line1"
                  value={address.street}
                  onChange={(e) => setField("street", e.target.value)}
                  disabled={saving}
                />
              </FormField>
            </div>
            <FormField label="Número" htmlFor="edit-number" required>
              <Input
                id="edit-number"
                type="text"
                autoComplete="address-line2"
                value={address.number}
                onChange={(e) => setField("number", e.target.value)}
                disabled={saving}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <FormField label="Complemento" htmlFor="edit-complement">
              <Input
                id="edit-complement"
                type="text"
                autoComplete="address-line2"
                value={address.complement}
                onChange={(e) => setField("complement", e.target.value)}
                disabled={saving}
              />
            </FormField>
            <FormField label="Bairro" htmlFor="edit-neighborhood">
              <Input
                id="edit-neighborhood"
                type="text"
                autoComplete="off"
                value={address.neighborhood}
                onChange={(e) => setField("neighborhood", e.target.value)}
                disabled={saving}
              />
            </FormField>
            <FormField label="UF" htmlFor="edit-state" required>
              <Input
                id="edit-state"
                type="text"
                autoComplete="address-level1"
                maxLength={2}
                value={address.state}
                onChange={(e) => setField("state", e.target.value.toUpperCase())}
                disabled={saving}
              />
            </FormField>
          </div>
        </section>

        {error && (
          <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
