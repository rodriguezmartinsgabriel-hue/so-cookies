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
      const timer2 = setTimeout(() => setPhase("done"), 500)
      return () => clearTimeout(timer2)
    }, 1500)

    return () => clearTimeout(timer)
  }, [pathname])

  if (!isClientRoute(pathname)) return null
  if (phase === "hidden" || phase === "done") return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-paper transition-opacity duration-500 ${phase === "fading" ? "opacity-0" : "opacity-100"}`}
    >
      <div className="animate-fade-in">
        <Image
          src="/logo.svg"
          alt="Só"
          width={80}
          height={80}
          unoptimized
          className="h-20 w-auto"
        />
      </div>
    </div>
  )
}