"use client"

import { useState } from "react"
import { useSync } from "@/hooks/useSync"
import { discardQueued } from "@/lib/db-local"
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react"
import { GlassSurface } from "@/components/ui/GlassSurface"

export function OfflineBanner() {
  const { isOnline, isSyncing, pendingCount, errors, doSync, clearErrors, refresh } = useSync()
  const [showErrors, setShowErrors] = useState(false)

  async function handleDiscard(itemKey?: string) {
    if (!itemKey) return
    await discardQueued(itemKey)
    await refresh()
  }

  return (
    <div className="fixed top-0 inset-x-0 z-50">
      {!isOnline && (
        <div className="bg-warning/90 text-ink px-4 pt-[env(safe-area-inset-top)] py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          Sem conexão — dados serão sincronizados quando voltar online
        </div>
      )}

      {isOnline && pendingCount > 0 && (
        <div className="bg-info/90 text-paper px-4 pt-[env(safe-area-inset-top)] py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
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

      {errors.length > 0 && (
        <div className="bg-danger/90 text-paper">
          <button
            onClick={() => setShowErrors((v) => !v)}
            className="w-full px-4 pt-[env(safe-area-inset-top)] py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            {errors.length} alteração{errors.length > 1 ? "ões" : ""} falhou{errors.length > 1 ? "ram" : ""} — ver
            detalhes
          </button>
          {showErrors && (
            <GlassSurface
              variant="glass"
              tone="strong"
              className="rounded-none text-ink shadow-lg max-h-[50vh] overflow-y-auto"
            >
              {errors.map((e) => (
                <div
                  key={e.id ?? `${e.entity}-${e.createdAt}`}
                  className="px-4 py-2 border-b border-line text-sm flex items-start gap-2"
                >
                  <div className="flex-1">
                    <p className="font-medium capitalize">
                      {e.entity} · {e.action}
                    </p>
                    <p className="text-muted">{e.error}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {e.dropped && (
                      <span className="text-[10px] font-bold bg-danger/10 text-danger px-2 py-0.5 rounded-full">
                        Descartada
                      </span>
                    )}
                    {e.itemKey && (
                      <button
                        onClick={() => handleDiscard(e.itemKey)}
                        className="text-[10px] font-semibold text-danger hover:underline"
                      >
                        Descartar alteração
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="px-4 py-2 flex justify-end">
                <button onClick={clearErrors} className="text-xs font-semibold text-danger">
                  Limpar erros
                </button>
              </div>
            </GlassSurface>
          )}
        </div>
      )}
    </div>
  )
}
