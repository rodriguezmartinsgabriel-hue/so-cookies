"use client"

import { type ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
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
  const content = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        {icon && <span className="text-muted shrink-0">{icon}</span>}
        <span className="text-sm text-ink truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        {value && <span className="text-sm text-muted text-right truncate">{value}</span>}
        {interactive && <ChevronRight className="w-4 h-4 text-muted shrink-0" />}
      </div>
    </>
  )

  const sharedClasses = cn(
    "flex items-center justify-between px-4 py-3",
    interactive && "cursor-pointer hover:bg-line/30 transition-colors",
    className,
  )

  if (href) {
    return (
      <Link href={href} aria-label={label} className={sharedClasses}>
        {content}
      </Link>
    )
  }

  return (
    <div className={sharedClasses} {...(onClick ? { onClick } : {})}>
      {content}
    </div>
  )
}
