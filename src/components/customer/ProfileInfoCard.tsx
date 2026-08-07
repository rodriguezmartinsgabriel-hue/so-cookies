"use client"

import type { ReactNode } from "react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

type ProfileInfoCardProps = {
  icon: ReactNode
  title: string
  /** Rótulo curto em uppercase acima do título (ex: "Dados pessoais"). */
  eyebrow?: string
  children: ReactNode
  action?: {
    label: string
    onClick: () => void
    /** Quando true, usa variant="secondary" (mais discreto). Default false (ghost). */
    emphasis?: boolean
    ariaLabel?: string
  }
  className?: string
}

export function ProfileInfoCard({
  icon,
  title,
  eyebrow,
  children,
  action,
  className,
}: ProfileInfoCardProps) {
  return (
    <Card padded={false} variant="glass" className={cn("rounded-2xl overflow-hidden", className)}>
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line/40">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 text-accent">
            {icon}
          </span>
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted font-semibold">{eyebrow}</p>
            )}
            <h3 className="text-base font-semibold text-ink truncate">{title}</h3>
          </div>
        </div>
        {action && (
          <Button
            variant={action.emphasis ? "secondary" : "ghost"}
            size="sm"
            onClick={action.onClick}
            aria-label={action.ariaLabel ?? action.label}
          >
            {action.label}
          </Button>
        )}
      </header>
      <div className="divide-y divide-line/30">{children}</div>
    </Card>
  )
}
