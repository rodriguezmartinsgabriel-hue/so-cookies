"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { WifiOff, RefreshCw, Cloud } from "lucide-react"
import { getLastSyncTime, getPendingSyncCount, NEVER_SYNCED } from "@/lib/db-local"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"

function formatSyncTime(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const now = new Date()
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  if (d.toDateString() === now.toDateString()) return time
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${time}`
}

export default function OfflinePage() {
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [stillOffline, setStillOffline] = useState(false)

  useEffect(() => {
    let ignore = false

    async function load() {
      const [count, t] = await Promise.all([getPendingSyncCount(), getLastSyncTime()])
      if (ignore) return
      setPendingCount(count)
      setLastSync(t && t !== NEVER_SYNCED ? t : null)
    }
    load()

    const goOnline = () => {
      window.location.href = "/"
    }
    window.addEventListener("online", goOnline)
    return () => {
      ignore = true
      window.removeEventListener("online", goOnline)
    }
  }, [])

  function handleRetry() {
    if (navigator.onLine) {
      window.location.href = "/"
      return
    }
    setRetrying(true)
    setStillOffline(false)
    let attempts = 0
    const id = window.setInterval(() => {
      attempts++
      if (navigator.onLine) {
        window.clearInterval(id)
        setRetrying(false)
        window.location.href = "/"
        return
      }
      if (attempts >= 4) {
        window.clearInterval(id)
        setRetrying(false)
        setStillOffline(true)
      }
    }, 750)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 py-10 text-center">
      <div className="space-y-5 max-w-sm w-full">
        <Image
          src="/logo.svg"
          alt="Só Cookies & Café"
          width={72}
          height={72}
          unoptimized
          className="h-16 w-auto mx-auto"
        />

        <div className="flex items-center justify-center gap-2">
          <WifiOff className="w-5 h-5 text-warning" />
          <h1 className="text-xl font-bold text-ink">Você está offline</h1>
        </div>

        <p className="text-muted text-sm leading-relaxed">
          Seus dados salvos continuam disponíveis. Qualquer alteração feita por aqui
          será sincronizada automaticamente quando a conexão voltar.
        </p>

        <Card className="space-y-2 text-left">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted">Alterações pendentes</span>
            <span className="text-sm font-semibold text-ink tabular-nums">{pendingCount}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted">Última sincronização</span>
            <span className="text-sm font-semibold text-ink tabular-nums">
              {lastSync ? formatSyncTime(lastSync) : "—"}
            </span>
          </div>
        </Card>

        {pendingCount > 0 && (
          <p className="flex items-center justify-center gap-1.5 text-xs text-info">
            <Cloud className="w-3.5 h-3.5" strokeWidth={2} />
            {pendingCount} alteração{pendingCount > 1 ? "ões" : ""} aguardando sincronização
          </p>
        )}

        <Button
          onClick={handleRetry}
          disabled={retrying}
          size="lg"
          className="w-full"
        >
          {retrying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Verificando conexão...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </>
          )}
        </Button>

        {stillOffline && (
          <p className="flex items-center justify-center gap-1.5 text-xs text-warning">
            <WifiOff className="w-3.5 h-3.5" strokeWidth={2} />
            Ainda sem conexão. Tente novamente em instantes.
          </p>
        )}
      </div>
    </main>
  )
}
