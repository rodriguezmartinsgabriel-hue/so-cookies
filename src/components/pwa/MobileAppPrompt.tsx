"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Bell, WifiOff, Zap } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { useIsMobile } from "@/hooks/useIsMobile"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"
import { isAndroidUA, isIOSUA } from "@/lib/device"

const DISMISS_KEY = "socookie-mobile-prompt-dismissed-at"
const INSTALLED_KEY = "socookie-mobile-prompt-installed"
const SAMPLE_KEY = "socookie-mobile-prompt-sample"
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function getRolloutPercent(): number {
  const raw = process.env.NEXT_PUBLIC_MOBILE_PROMPT_ROLLOUT
  if (!raw) return 100
  const pct = Number(raw)
  return Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 100
}

function readDismissedAt(): number {
  if (typeof window === "undefined") return 0
  const ts = Number(localStorage.getItem(DISMISS_KEY))
  return Number.isFinite(ts) && ts > 0 ? ts : 0
}

function isPermanentlyInstalled(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(INSTALLED_KEY) === "true"
}

function includedInRollout(): boolean {
  const pct = getRolloutPercent()
  if (pct <= 0) return false
  if (pct >= 100) return true
  try {
    let sample = localStorage.getItem(SAMPLE_KEY)
    if (sample === null) {
      sample = String(Math.floor(Math.random() * 100))
      localStorage.setItem(SAMPLE_KEY, sample)
    }
    return Number(sample) < pct
  } catch {
    return Math.random() * 100 < pct
  }
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(display-mode: standalone)").matches
}

function isIOSDevice(): boolean {
  return typeof navigator !== "undefined" && isIOSUA(navigator.userAgent)
}

function isAndroidDevice(): boolean {
  return typeof navigator !== "undefined" && isAndroidUA(navigator.userAgent)
}

export function MobileAppPrompt() {
  const isMobile = useIsMobile()
  const haptic = useHapticFeedback()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [standalone] = useState(isStandaloneMode)
  const [isIOS] = useState(isIOSDevice)
  const [isAndroid] = useState(isAndroidDevice)
  const [installed, setInstalled] = useState(false)
  const [permanentlyInstalled] = useState(isPermanentlyInstalled)
  const [rolloutIncluded] = useState(includedInRollout)
  const [dismissedInCooldown, setDismissedInCooldown] = useState(() => {
    const at = readDismissedAt()
    return at > 0 && Date.now() - at < COOLDOWN_MS
  })
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const onBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const dismiss = () => {
    haptic.tap()
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {}
    setDismissedInCooldown(true)
  }

  const handleHaveApp = () => {
    haptic.tap()
    try {
      localStorage.setItem(INSTALLED_KEY, "true")
    } catch {}
    setInstalled(true)
  }

  const handlePrimary = async () => {
    haptic.tap()
    if (isAndroid && deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setInstalled(true)
      }
      return
    }
    setShowHelp(true)
  }

  if (isMobile === null) return null

  const eligible =
    isMobile === true &&
    !standalone &&
    !installed &&
    !permanentlyInstalled &&
    !dismissedInCooldown &&
    rolloutIncluded

  return (
    <Modal open={eligible} onClose={dismiss} title="Instale o app da Só" size="sm">
      <div className="px-6 py-6 space-y-6">
        <Image src="/logo.svg" alt="Só" width={72} height={72} unoptimized className="h-16 w-auto mx-auto" />

        <p className="text-sm leading-relaxed text-muted">
          Experiência feita para o celular: mais rápido, funciona offline e com seus pedidos a um toque.
        </p>

        <ul className="space-y-3 text-left">
          <Feature icon={Zap} label="Carregamento rápido" />
          <Feature icon={WifiOff} label="Funciona offline" />
          <Feature icon={Bell} label="Avisos dos seus pedidos" />
        </ul>

        {showHelp ? (
          <div className="rounded-xl bg-cream/70 p-4 text-left space-y-3">
            <p className="text-xs font-semibold text-ink">Como instalar no seu celular:</p>
            <ol className="space-y-2">
              {isIOS ? (
                <>
                  <Step n={1} text="Toque em Compartilhar (ícone da seta para cima)" />
                  <Step n={2} text='Role e toque em "Adicionar à Tela de Início"' />
                  <Step n={3} text='Toque em "Adicionar"' />
                </>
              ) : (
                <>
                  <Step n={1} text="Abra o menu do navegador (⋮)" />
                  <Step n={2} text='Toque em "Instalar app" ou "Adicionar à tela inicial"' />
                </>
              )}
            </ol>
          </div>
        ) : null}

        <div className="space-y-2">
          {!showHelp && (
            <button
              onClick={handlePrimary}
              className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-paper transition-colors hover:bg-accent/90"
            >
              {isIOS ? "Ver como instalar" : "Instalar app"}
            </button>
          )}
          <button
            onClick={dismiss}
            className="w-full rounded-xl border border-ink/20 px-4 py-3 text-sm opacity-70 transition-opacity hover:opacity-100"
          >
            Agora não
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={handleHaveApp}
            className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-ink"
          >
            Já tenho o app instalado
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Feature({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0">
        <Icon className="w-4 h-4" strokeWidth={2} />
      </span>
      <span className="text-sm font-medium text-ink">{label}</span>
    </li>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent text-paper text-xs font-bold shrink-0 mt-0.5">
        {n}
      </span>
      <span className="text-xs leading-relaxed text-muted">{text}</span>
    </li>
  )
}
