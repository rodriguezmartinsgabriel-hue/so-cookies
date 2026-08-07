"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { FormField } from "@/components/ui/FormField"

type EditPasswordModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (params: { currentPassword: string; newPassword: string }) => Promise<void>
}

export function EditPasswordModal({ open, onClose, onSubmit }: EditPasswordModalProps) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = current.length > 0 && next.length >= 6

  function handleClose() {
    if (saving) return
    setCurrent("")
    setNext("")
    setError(null)
    onClose()
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ currentPassword: current, newPassword: next })
      setCurrent("")
      setNext("")
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível alterar a senha.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Alterar senha"
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="md" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? "Salvando…" : "Alterar senha"}
          </Button>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        <FormField label="Senha atual" htmlFor="current-password">
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            placeholder="Sua senha atual"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            disabled={saving}
          />
        </FormField>
        <FormField
          label="Nova senha"
          htmlFor="new-password"
          hint={next.length > 0 && next.length < 6 ? "Mínimo de 6 caracteres" : "Mínimo 6 caracteres"}
        >
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="Crie uma nova senha"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            disabled={saving}
          />
        </FormField>
        {error && (
          <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
