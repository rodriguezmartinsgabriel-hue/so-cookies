"use client"

import { useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShoppingBag, ArrowRight } from "lucide-react"
import Link from "next/link"
import { formatBRL } from "@/lib/utils"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"
import { useReducedMotion } from "@/hooks/useReducedMotion"

type CartFloatingBarProps = {
  total: number
  itemCount: number
}

export function CartFloatingBar({ total, itemCount }: CartFloatingBarProps) {
  const haptic = useHapticFeedback()
  const reducedMotion = useReducedMotion()

  const handleTap = useCallback(() => {
    haptic.tap()
  }, [haptic])

  return (
    <AnimatePresence>
      {itemCount > 0 && (
        <motion.div
          className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 px-4 pb-2 pointer-events-none"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: reducedMotion ? 1 : 300, damping: reducedMotion ? 1 : 28 }}
        >
        <Link
          href="/carrinho"
          onClick={handleTap}
          className="pointer-events-auto block"
        >
          <motion.div
            className="bg-paper/90 backdrop-blur-sm rounded-2xl border border-line/50 shadow-lg px-4 py-3 flex items-center justify-between"
            whileTap={reducedMotion ? {} : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: reducedMotion ? 1 : 400, damping: reducedMotion ? 1 : 20 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ink/5 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-ink" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs text-muted">
                  {itemCount} {itemCount === 1 ? "item" : "itens"}
                </p>
                <motion.p
                  key={total}
                  initial={{ scale: 0.9, y: 4 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="text-base font-bold text-ink"
                >
                  {formatBRL(total)}
                </motion.p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-accent">Ver carrinho</span>
              <ArrowRight className="w-4 h-4 text-accent" strokeWidth={2} />
            </div>
          </motion.div>
        </Link>
      </motion.div>
      )}
    </AnimatePresence>
  )
}