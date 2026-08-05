"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"

const SPLASH_KEY = "splash-shown"

const CLIENT_ROUTES = ["/", "/cardapio", "/carrinho", "/entrar", "/cadastro", "/perfil", "/pedido", "/pedidos", "/vendas", "/contatos", "/estoque", "/produtos", "/receitas", "/canais", "/caixa", "/delivery", "/rotas", "/integracoes", "/producao", "/documentos", "/relatorios", "/usuarios", "/indicadores"]

function isClientRoute(pathname: string) {
  return CLIENT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  )
}

function hasSplashBeenShown(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_KEY) === "true"
  } catch {
    return true
  }
}

function markSplashShown() {
  try {
    sessionStorage.setItem(SPLASH_KEY, "true")
  } catch {}
}

export function LoadingScreen() {
  const pathname = usePathname()
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading" | "done">("hidden")
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    if (!isClientRoute(pathname)) return
    if (hasSplashBeenShown()) return
    mounted.current = true

    const show = setTimeout(() => {
      setPhase("visible")
      markSplashShown()
      const fade = setTimeout(() => setPhase("fading"), 1500)
      const done = setTimeout(() => setPhase("done"), 2100)
      return () => {
        clearTimeout(fade)
        clearTimeout(done)
      }
    }, 50)

    return () => clearTimeout(show)
  }, [pathname])

  if (!isClientRoute(pathname)) return null
  if (phase === "hidden" || phase === "done") return null

  return (
    <div
      className={`loading-screen fixed inset-0 z-50 flex items-center justify-center bg-paper transition-opacity duration-500 ${phase === "fading" ? "loading-screen-exit" : "loading-screen-enter"}`}
    >
      <div className="loading-logo-wrapper">
        <Image
          src="/so-cookies-logo.svg"
          alt="Só Cookies & Café"
          width={120}
          height={120}
          unoptimized
          priority
          className="loading-logo h-24 w-auto sm:h-28 md:h-32"
        />
      </div>
    </div>
  )
}
