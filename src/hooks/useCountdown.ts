"use client"

import { useEffect, useRef, useState } from "react"

const HOUR = 3_600_000
const MINUTE = 60_000

export function useCountdown(target: string | null): string {
  const [label, setLabel] = useState("")
  const prevTargetRef = useRef<string | null>(target)

  useEffect(() => {
    if (target === prevTargetRef.current) return
    prevTargetRef.current = target
    setLabel("")
  }, [target])

  useEffect(() => {
    if (!target) return
    const end = new Date(target).getTime()
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      const diff = end - Date.now()
      if (diff <= 0) {
        setLabel("Prazo encerrado")
        return
      }
      const d = Math.floor(diff / 86_400_000)
      const h = Math.floor((diff % 86_400_000) / HOUR)
      const m = Math.floor((diff % HOUR) / MINUTE)
      const s = Math.floor((diff % MINUTE) / 1_000)
      const parts: string[] = []
      if (d > 0) parts.push(`${d}d`)
      parts.push(`${h}h`)
      parts.push(`${m}m`)
      if (diff < HOUR) parts.push(`${s}s`)
      setLabel(parts.join(" "))
      timer = setTimeout(tick, diff < HOUR ? 1_000 : MINUTE)
    }

    tick()
    return () => clearTimeout(timer)
  }, [target])

  return label
}
