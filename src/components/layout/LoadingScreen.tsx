"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"

const CLIENT_ROUTES = ["/cardapio", "/carrinho", "/entrar", "/cadastro", "/perfil", "/pedido"]

function isClientRoute(pathname: string) {
  return CLIENT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  )
}

export function LoadingScreen() {
  const pathname = usePathname()
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading" | "done">("hidden")
  const dismissed = useRef(false)

  useEffect(() => {
    if (!isClientRoute(pathname)) return
    if (dismissed.current) return
    dismissed.current = true

    setPhase("visible")

    const timer = setTimeout(() => {
      setPhase("fading")
      const timer2 = setTimeout(() => setPhase("done"), 600)
      return () => clearTimeout(timer2)
    }, 1500)

    return () => clearTimeout(timer)
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
