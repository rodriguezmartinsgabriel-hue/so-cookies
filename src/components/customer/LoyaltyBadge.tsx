"use client"

import { Sparkles } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"

interface BalanceResponse {
  balance: number
  lifetimeEarned: number
  lifetimeSpent: number
  active: boolean
  pointsPerReal: number
}

export function LoyaltyBadge() {
  const haptic = useHapticFeedback()
  const [data, setData] = useState<BalanceResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    async function fetchBalance() {
      try {
        const res = await fetch("/api/public/loyalty/balance", { cache: "no-store" })
        if (!res.ok) {
          if (!cancelled) setLoading(false)
          return
        }
        const json = (await res.json()) as BalanceResponse
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    fetchBalance()
    timer = setInterval(fetchBalance, 60_000)

    function onVisible() {
      if (document.visibilityState === "visible") fetchBalance()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  if (loading || !data || !data.active) {
    return null
  }

  const hasPoints = data.balance > 0

  return (
    <Link
      href="/perfil#pontos"
      onClick={() => haptic.tap()}
      aria-label="Programa de pontos"
      className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-cream transition-colors px-2"
    >
      <Sparkles className="w-5 h-5 text-accent" strokeWidth={1.5} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={data.balance}
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 2 }}
          transition={{ duration: 0.18 }}
          className="ml-1.5 text-[11px] font-semibold text-ink leading-none whitespace-nowrap"
          title={hasPoints ? "Você tem pontos" : "Ganhe pontos a cada compra"}
        >
          {hasPoints ? `${data.balance} pts` : "Ganhar pts"}
        </motion.span>
      </AnimatePresence>
    </Link>
  )
}
