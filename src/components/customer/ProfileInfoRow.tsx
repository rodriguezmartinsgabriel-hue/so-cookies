"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type ProfileInfoRowProps = {
  label: string
  value?: ReactNode
  className?: string
}

export function ProfileInfoRow({ label, value, className }: ProfileInfoRowProps) {
  const display = value === undefined || value === null || value === "" ? "Não informado" : value
  const isEmpty = value === undefined || value === null || value === ""

  return (
    <div className={cn("flex items-center justify-between gap-3 px-5 py-3.5", className)}>
      <span className="text-sm text-ink shrink-0">{label}</span>
      <span
        className={cn(
          "text-sm text-right truncate max-w-[60%]",
          isEmpty ? "text-muted italic" : "text-muted",
        )}
      >
        {display}
      </span>
    </div>
  )
}
