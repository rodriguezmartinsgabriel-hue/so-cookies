"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ShoppingBag } from "lucide-react"
import { GlassSurface } from "@/components/ui/GlassSurface"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"
import { LoyaltyBadge } from "./LoyaltyBadge"

export function CustomerHeader({ cartCount = 0 }: { cartCount?: number }) {
  const haptic = useHapticFeedback()

  return (
    <GlassSurface
      as="header"
      tone="strong"
      className="sticky top-0 z-40 rounded-none border-0 w-full"
    >
      <div className="max-w-md mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 flex items-center justify-between min-h-14">
        <Link href="/cardapio" className="font-bold text-ink truncate">
          Só Cookies & Café
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <LoyaltyBadge />
          <Link
            href="/carrinho"
            className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-cream transition-colors"
            aria-label="Carrinho"
            onClick={() => haptic.tap()}
          >
            <ShoppingBag className="w-5 h-5 text-ink" />
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-accent text-paper text-[10px] font-bold flex items-center justify-center"
              >
                {cartCount}
              </motion.span>
            )}
          </Link>
        </div>
      </div>
    </GlassSurface>
  )
}
