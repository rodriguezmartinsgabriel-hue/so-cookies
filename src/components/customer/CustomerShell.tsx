"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag, User, LayoutGrid } from "lucide-react"
import { GlassSurface } from "@/components/ui/GlassSurface"

export function CustomerShell({
  children,
  cartCount = 0,
}: {
  children: React.ReactNode
  cartCount?: number
}) {
  const pathname = usePathname()
  const isAuthPage = pathname === "/entrar" || pathname === "/cadastro"

  if (isAuthPage) {
    return (
      <div className="min-h-screen">
        <GlassSurface
          as="header"
          tone="strong"
          className="sticky top-0 z-40 rounded-none"
        >
          <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
            <Link href="/cardapio" className="font-bold text-ink">
              Só Cookies & Café
            </Link>
          </div>
        </GlassSurface>
        <main className="max-w-md mx-auto px-4 py-6">{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <GlassSurface as="header" tone="strong" className="sticky top-0 z-40 rounded-none">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/cardapio" className="font-bold text-ink">
            Só Cookies & Café
          </Link>
          <Link
            href="/carrinho"
            className="relative p-2 rounded-lg hover:bg-cream transition-colors"
            aria-label="Carrinho"
          >
            <ShoppingBag className="w-5 h-5 text-ink" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-ink text-paper text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </GlassSurface>

      <main className="max-w-md mx-auto px-4 py-4 pb-28">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pointer-events-none">
        <GlassSurface tone="strong" className="max-w-md mx-auto flex items-center justify-around h-16 rounded-2xl pointer-events-auto animate-fade-in-up">
          <NavLink href="/cardapio" label="Cardápio" icon={LayoutGrid} pathname={pathname} />
          <NavLink href="/carrinho" label="Carrinho" icon={ShoppingBag} pathname={pathname} badge={cartCount} />
          <NavLink href="/perfil" label="Conta" icon={User} pathname={pathname} />
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
}: {
  href: string
  label: string
  icon: React.ElementType
  pathname: string
  badge?: number
}) {
  const isActive = pathname === href || pathname.startsWith(href)
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-lg transition-colors relative ${
        isActive ? "text-ink" : "text-muted"
      }`}
    >
      {badge > 0 && (
        <span className="absolute top-1 right-2 min-w-4 h-4 px-1 rounded-full bg-ink text-paper text-[10px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
      <Icon className="w-5 h-5" strokeWidth={1.5} />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Link>
  )
}
