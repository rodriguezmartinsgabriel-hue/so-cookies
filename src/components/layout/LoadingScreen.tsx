"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

const SPLASH_KEY = "splash-shown"

const CLIENT_ROUTES = ["/", "/cardapio", "/carrinho", "/entrar", "/cadastro", "/perfil", "/pedido", "/pedidos", "/vendas", "/contatos", "/estoque", "/produtos", "/receitas", "/canais", "/caixa", "/delivery", "/rotas", "/integracoes", "/producao", "/documentos", "/relatorios", "/usuarios", "/indicadores"]

function isClientRoute(pathname: string) {
  return CLIENT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  )
}

function markSplashShown() {
  try {
    sessionStorage.setItem(SPLASH_KEY, "true")
  } catch {}
}

export function LoadingScreen() {
  const pathname = usePathname()
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading" | "done">("visible")
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    if (!isClientRoute(pathname)) return
    mounted.current = true

    markSplashShown()
    const fade = setTimeout(() => setPhase("fading"), 1500)
    const done = setTimeout(() => setPhase("done"), 2100)
    return () => {
      clearTimeout(fade)
      clearTimeout(done)
    }
  }, [pathname])

  if (!isClientRoute(pathname)) return null
  if (phase === "hidden" || phase === "done") return null

  return (
    <div
      className={`loading-screen fixed inset-0 z-50 flex items-center justify-center bg-[#ffffff] ${phase === "fading" ? "loading-screen-exit" : "loading-screen-enter"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/so-cookies-logo-final.png"
        alt="Só Cookies & Café"
        className="loading-logo-zoom loading-logo-img h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28"
      />
    </div>
  )
}
