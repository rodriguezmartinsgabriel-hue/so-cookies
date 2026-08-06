"use client"

import { Flame } from "lucide-react"

type CalorieBadgeProps = {
  calories: number | null
  variant?: "inline" | "compact"
  className?: string
}

export function CalorieBadge({ calories, variant = "inline", className = "" }: CalorieBadgeProps) {
  if (calories == null) return null

  const configs = {
    inline: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ink/5 text-ink text-xs font-medium",
    compact:
      "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-medium",
  }

  return (
    <span className={`${configs[variant]} ${className}`}>
      <Flame className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
      <span>{Math.round(calories)} cal</span>
    </span>
  )
}
