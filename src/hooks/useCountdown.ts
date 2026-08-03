"use client"

import { useEffect, useState } from "react"

export function useCountdown(target: string | null): string {
  const [label, setLabel] = useState("")
  const [prevTarget, setPrevTarget] = useState<string | null>(target)

  if (target !== prevTarget) {
    setPrevTarget(target)
    setLabel("")
  }

  useEffect(() => {
    if (!target) return
    const end = new Date(target).getTime()
    const tick = () => {
      const diff = end - Date.now()
      if (diff <= 0) {
        setLabel("Prazo encerrado")
        return
      }
      const d = Math.floor(diff / 86_400_000)
      const h = Math.floor((diff % 86_400_000) / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      const parts: string[] = []
      if (d > 0) parts.push(`${d}d`)
      parts.push(`${h}h`)
      parts.push(`${m}m`)
      parts.push(`${s}s`)
      setLabel(parts.join(" "))
    }
    tick()
    const interval = setInterval(tick, 1_000)
    return () => clearInterval(interval)
  }, [target])

  return label
}
