"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { GlassSurface } from "@/components/ui/GlassSurface"

type ProfileSectionProps = {
  icon?: ReactNode
  title: string
  children: ReactNode
  className?: string
}

export function ProfileSection({ icon, title, children, className }: ProfileSectionProps) {
  return (
    <GlassSurface variant="solid" className={cn("overflow-hidden", className)}>
      <div className="flex items-center gap-2 px-4 py-3">
        {icon && <span className="text-muted">{icon}</span>}
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      <div className="border-t border-line/50">{children}</div>
    </GlassSurface>
  )
}