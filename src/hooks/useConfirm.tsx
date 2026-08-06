"use client"

import { useCallback, useState } from "react"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"

type ConfirmOptions = {
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export function useConfirm() {
  const [options, setOptions] = useState<(ConfirmOptions & { title: string; resolve: (ok: boolean) => void }) | null>(
    null,
  )

  const confirm = useCallback((title: string, message?: string, opts?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions({ title, message, ...opts, resolve })
    })
  }, [])

  const dialog = options ? (
    <ConfirmDialog
      title={options.title}
      message={options.message}
      confirmLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel}
      danger={options.danger}
      onConfirm={() => {
        const resolve = options.resolve
        setOptions(null)
        resolve(true)
      }}
      onCancel={() => {
        const resolve = options.resolve
        setOptions(null)
        resolve(false)
      }}
    />
  ) : null

  return { confirm, dialog }
}
