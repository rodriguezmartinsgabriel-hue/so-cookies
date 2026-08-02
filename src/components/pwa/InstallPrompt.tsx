"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone] = useState(() => typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches)
  const [dismissed, setDismissed] = useState(() => typeof window !== "undefined" && localStorage.getItem("pwa-dismissed") === "true")
  const [isIOS] = useState(() => typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window))

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener("beforeinstallprompt", handler as EventListener)
    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setDeferredPrompt(null)
      }
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem("pwa-dismissed", "true")
  }

  if (isStandalone || dismissed) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
      <div className="mx-auto max-w-md rounded-2xl bg-ink p-6 text-paper shadow-lg">
        <div className="space-y-4">
          <div className="space-y-2 text-center">
            <Image
              src="/logo.svg"
              alt="Só"
              width={64}
              height={64}
              unoptimized
              className="h-16 w-auto mx-auto"
            />
            <p className="text-sm opacity-80">
              Instale o app no seu dispositivo para acesso rápido e funcionamento offline.
            </p>
          </div>

          {isIOS ? (
            <div className="rounded-lg bg-paper/10 p-3 text-center text-xs leading-relaxed opacity-90">
              Toque em <strong>&quot;Compartilhar&quot;</strong> e depois em{" "}
              <strong>&quot;Adicionar à Tela de Início&quot;</strong>
            </div>
          ) : null}

          <div className="flex gap-3">
            {!isIOS && deferredPrompt ? (
              <button
                onClick={handleInstall}
                className="flex-1 rounded-lg bg-paper px-4 py-3 font-semibold text-ink transition-colors hover:bg-cream"
              >
                Instalar App
              </button>
            ) : null}
            <button
              onClick={handleDismiss}
              className="flex-1 rounded-lg border border-paper/20 px-4 py-3 text-sm opacity-70 transition-opacity hover:opacity-100"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}