"use client"

import { type ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type ProfileRowProps = {
  icon?: ReactNode
  label: string
  value?: ReactNode
  href?: string
  onClick?: () => void
  className?: string
}

export function ProfileRow({ icon, label, value, href, onClick, className }: ProfileRowProps) {
  const interactive = href || onClick

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3",
        interactive && "cursor-pointer hover:bg-line/30 transition-colors",
        className,
      )}
      {...(href ? { role: "link", tabIndex: 0, onClick } : {})}
      {...(onClick ? { onClick } : {})}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && <span className="text-muted shrink-0">{icon}</span>}
        <span className="text-sm text-ink truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        {value && <span className="text-sm text-muted text-right truncate">{value}</span>}
        {interactive && <ChevronRight className="w-4 h-4 text-muted shrink-0" />}
      </div>
    </div>
  )
}