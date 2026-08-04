"use client"

import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { formatBRL } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

type StickyBottomCTAProps = {
  total: number
  itemCount: number
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
}

export function StickyBottomCTA({
  total,
  itemCount,
  label,
  onPress,
  disabled = false,
  loading = false,
}: StickyBottomCTAProps) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+8px)] pointer-events-none"
    >
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="absolute inset-0 bg-gradient-to-t from-paper via-paper/90 to-transparent" />
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="relative bg-paper/80 backdrop-blur-xl rounded-2xl border border-line/50 shadow-xl p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-muted">
                {itemCount} {itemCount === 1 ? "item" : "itens"}
              </p>
              <p className="text-lg font-bold text-ink">{formatBRL(total)}</p>
            </div>
          </div>
          <Button
            size="lg"
            variant="primary"
            className="w-full"
            disabled={disabled || loading}
            onClick={onPress}
          >
            {loading ? "Finalizando..." : label}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  )
}