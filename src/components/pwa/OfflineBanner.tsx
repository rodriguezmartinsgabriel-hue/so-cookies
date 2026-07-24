"use client"

import { useSync } from "@/hooks/useSync"
import { WifiOff, RefreshCw } from "lucide-react"

export function OfflineBanner() {
  const { isOnline, isSyncing, pendingCount, doSync } = useSync()

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-warning/90 text-ink px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          Sem conexão — dados serão sincronizados quando voltar online
        </div>
      )}

      {isOnline && pendingCount > 0 && (
        <div className="fixed top-0 inset-x-0 z-50 bg-info/90 text-paper px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Sincronizando {pendingCount} alterações...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 cursor-pointer" onClick={doSync} />
              {pendingCount} alterações pendentes — toque para sincronizar
            </>
          )}
        </div>
      )}
    </>
  )
}