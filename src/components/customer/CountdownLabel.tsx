"use client"

import { memo } from "react"
import { useCountdown } from "@/hooks/useCountdown"

type CountdownLabelProps = {
  target: string | null
  className?: string
}

export const CountdownLabel = memo(function CountdownLabel({
  target,
  className = "",
}: CountdownLabelProps) {
  const label = useCountdown(target)
  return <span className={className}>{label}</span>
})
