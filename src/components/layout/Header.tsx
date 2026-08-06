"use client"

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react"
import { Bell, User, LogOut, AlertTriangle, Package, Truck, Check, X, ChevronLeft, Cloud } from "lucide-react"
import { useNotifications, type Notification } from "@/lib/notifications"
import { useSync } from "@/hooks/useSync"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { GlassSurface } from "@/components/ui/GlassSurface"

type User = {
  name?: string | null
  email?: string | null
  role?: string
}

function NotifIcon({ type }: { type: Notification["type"] }) {
  switch (type) {
    case "low_stock":
      return <AlertTriangle className="w-4 h-4 text-warning" />
    case "pending_order":
      return <Package className="w-4 h-4 text-info" />
    case "ready_order":
      return <Truck className="w-4 h-4 text-success" />
    default:
      return <Check className="w-4 h-4 text-muted" />
  }
}

function formatSyncTime(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const now = new Date()
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  if (d.toDateString() === now.toDateString()) return time
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${time}`
}

export function Header({ user, onLogout }: { user?: User; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications()
  const { isOnline, isSyncing, pendingCount, errors, lastSync } = useSync()
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const showLastSync = isOnline && !isSyncing && pendingCount === 0 && errors.length === 0 && lastSync

  const subscribeHistory = useCallback((cb: () => void) => {
    window.addEventListener("popstate", cb)
    return () => window.removeEventListener("popstate", cb)
  }, [])

  const canGoBack = useSyncExternalStore(
    subscribeHistory,
    () => (window.history.state?.idx ?? 0) > 0,
    () => false,
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleNotifClick(n: Notification) {
    markAsRead(n.id)
    setOpen(false)
    if (n.href) router.push(n.href)
  }

  return (
    <GlassSurface
      as="header"
      tone="strong"
      className="h-14 flex items-center justify-between px-4 lg:px-6 shrink-0 rounded-none"
    >
      <div className="lg:hidden flex items-center gap-1">
        {canGoBack && (
          <button
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg hover:bg-cream text-ink transition-colors"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={1.5} />
          </button>
        )}
        <Image src="/logo.svg" alt="Só Cookies & Café" width={32} height={32} className="h-8 w-auto" />
      </div>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-1.5 sm:gap-3">
        {showLastSync && (
          <div
            className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-cream border border-line text-muted"
            title={`Sincronizado às ${formatSyncTime(lastSync)}`}
          >
            <Cloud className="w-3.5 h-3.5 text-success shrink-0" strokeWidth={2} />
            <span className="text-[11px] font-medium leading-none tabular-nums whitespace-nowrap">
              <span className="hidden sm:inline">Sincronizado · </span>
              {formatSyncTime(lastSync)}
            </span>
          </div>
        )}
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="relative flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg hover:bg-cream text-muted transition-colors"
            aria-label="Notificações"
            aria-expanded={open}
          >
            <Bell className="w-5 h-5" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[20px] h-5 flex items-center justify-center bg-danger text-paper text-[10px] font-bold rounded-full px-1.5">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <GlassSurface
              tone="strong"
              className="absolute right-0 top-full mt-2 w-[min(20rem,calc(100vw-2rem))] max-h-[70vh] rounded-xl z-50 overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                <h3 className="text-sm font-bold text-ink">Notificações</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="px-2 py-2 text-[11px] text-info hover:text-info/80 transition-colors"
                    >
                      Marcar tudo lido
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded hover:bg-cream text-muted"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-8 h-8 text-kraft mx-auto mb-2" strokeWidth={1} />
                    <p className="text-xs text-muted">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-cream/50 transition-colors border-b border-line last:border-0 ${
                        !n.read ? "bg-info/5" : ""
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        <NotifIcon type={n.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${!n.read ? "font-semibold text-ink" : "text-muted"}`}>{n.title}</p>
                        <p className="text-[11px] text-muted truncate">{n.message}</p>
                      </div>
                      {!n.read && <span className="w-2 h-2 bg-info rounded-full mt-1 shrink-0" />}
                    </button>
                  ))
                )}
              </div>
            </GlassSurface>
          )}
        </div>

        <ThemeToggle />

        <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-line">
          <div className="hidden sm:flex w-8 h-8 rounded-full bg-ink items-center justify-center">
            <User className="w-4 h-4 text-paper" strokeWidth={1.5} />
          </div>
          <span className="hidden sm:block text-sm font-medium text-ink">{user?.name || "Usuário"}</span>
          <button
            onClick={onLogout}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md hover:bg-cream text-muted transition-colors"
            title="Sair"
            aria-label="Sair da conta"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </GlassSurface>
  )
}
