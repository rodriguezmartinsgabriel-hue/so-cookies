"use client"

import { FormField } from "@/components/ui/FormField"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { X, Check } from "lucide-react"

type ProfileEditListProps = {
  fields: {
    label: string
    name: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    type?: string
    maxLength?: number
    autoComplete?: string
    inputMode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url"
  }[]
  onCancel: () => void
  onSave: () => void
  saving: boolean
  saveLabel?: string
}

export function ProfileEditList({ fields, onCancel, onSave, saving, saveLabel = "Salvar" }: ProfileEditListProps) {
  return (
    <ul className="divide-y divide-line/50">
      {fields.map((field) => (
        <li key={field.name} className="px-4 py-3">
          <FormField label={field.label} htmlFor={field.name}>
            <Input
              id={field.name}
              type={field.type || "text"}
              autoComplete={field.autoComplete}
              inputMode={field.inputMode}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
            />
          </FormField>
        </li>
      ))}
      <li className="flex gap-2 px-4 py-3">
        <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4" /> Cancelar
        </Button>
        <Button variant="primary" size="md" className="flex-1" onClick={onSave} disabled={saving}>
          <Check className="w-4 h-4" /> {saveLabel}
        </Button>
      </li>
    </ul>
  )
}
