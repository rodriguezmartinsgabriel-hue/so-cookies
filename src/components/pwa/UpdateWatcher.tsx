"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function UpdateWatcher() {
  const pathname = usePathname()

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    const handleControllerChange = () => {
      if (pathname !== "/carrinho") {
        window.location.reload()
      }
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange)
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange)
  }, [pathname])

  return null
}
