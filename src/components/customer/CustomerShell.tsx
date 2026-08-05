"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag, User, LayoutGrid } from "lucide-react"
import { motion } from "framer-motion"
import { GlassSurface } from "@/components/ui/GlassSurface"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"
import { InstallPrompt } from "@/components/pwa/InstallPrompt"
import { CartFloatingBar } from "./CartFloatingBar"

export function CustomerShell({
  children,
  cartCount = 0,
  cartTotal = 0,
  showCartBar = true,
}: {
  children: React.ReactNode
  cartCount?: number
  cartTotal?: number
  showCartBar?: boolean
}) {
  const pathname = usePathname()
  const isAuthPage = pathname === "/entrar" || pathname === "/cadastro"
  const haptic = useHapticFeedback()

  if (isAuthPage) {
    return (
      <div className="min-h-dvh">
        <GlassSurface
          as="header"
          tone="strong"
          className="sticky top-0 z-40 rounded-none border-0 w-full"
        >
          <div className="max-w-md mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 flex items-center justify-between min-h-14">
            <Link href="/cardapio" className="font-bold text-ink truncate">
              Só Cookies & Café
            </Link>
            <ThemeToggle />
          </div>
        </GlassSurface>
        <main className="max-w-md mx-auto px-4 py-6">{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh">
      <GlassSurface as="header" tone="strong" className="sticky top-0 z-40 rounded-none border-0 w-full">
        <div className="max-w-md mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 flex items-center justify-between min-h-14">
          <Link href="/cardapio" className="font-bold text-ink truncate">
            Só Cookies & Café
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
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

      <main className="max-w-md mx-auto px-4 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</main>

      {showCartBar && cartCount > 0 && (
        <CartFloatingBar total={cartTotal} itemCount={cartCount} />
      )}

      <InstallPrompt />

      <nav className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <GlassSurface
          tone="strong"
          className="w-full rounded-t-2xl rounded-b-none border-x-0 border-b-0 border-t border-line/50 flex justify-center pointer-events-auto animate-fade-in-up"
        >
          <div className="w-full max-w-md px-2 pb-[env(safe-area-inset-bottom,0px)] pt-2 flex items-center justify-around h-16">
            <NavLink href="/cardapio" label="Cardápio" icon={LayoutGrid} pathname={pathname} haptic={haptic} />
            <NavLink href="/carrinho" label="Carrinho" icon={ShoppingBag} pathname={pathname} badge={cartCount} haptic={haptic} />
            <NavLink href="/perfil" label="Conta" icon={User} pathname={pathname} haptic={haptic} />
          </div>
        </GlassSurface>
      </nav>
    </div>
  )
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  badge = 0,
  haptic,
}: {
  href: string
  label: string
  icon: React.ElementType
  pathname: string
  badge?: number
  haptic: ReturnType<typeof useHapticFeedback>
}) {
  const isActive = pathname === href || pathname.startsWith(href)
  return (
    <motion.div
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-lg relative"
    >
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={`absolute inset-0 flex flex-col items-center justify-center gap-0.5 w-full h-full rounded-lg transition-colors ${
          isActive ? "text-accent" : "text-muted"
        }`}
        onClick={() => haptic.tap()}
      >
      {badge > 0 && (
        <motion.span
          key={badge}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-1 right-2 min-w-4 h-4 px-1 rounded-full bg-accent text-paper text-[10px] font-bold flex items-center justify-center"
        >
          {badge}
        </motion.span>
      )}
      <Icon className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-xs font-medium leading-none">{label}</span>
    </Link>
    </motion.div>
  )
}

