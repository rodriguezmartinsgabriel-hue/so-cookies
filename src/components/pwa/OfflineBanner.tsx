"use client"

import { useState } from "react"
import { useSync } from "@/hooks/useSync"
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react"

export function OfflineBanner() {
  const { isOnline, isSyncing, pendingCount, errors, doSync, clearErrors } = useSync()
  const [showErrors, setShowErrors] = useState(false)

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
          <button onClick={() => setShowErrors((v) => !v)} className="w-full px-4 pt-[env(safe-area-inset-top)] py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {errors.length} alteração{errors.length > 1 ? "ões" : ""} falhou{errors.length > 1 ? "ram" : ""} — ver detalhes
          </button>
          {showErrors && (
            <div className="bg-paper text-ink shadow-lg max-h-[50vh] overflow-y-auto">
              {errors.map((e) => (
                <div key={e.id ?? `${e.entity}-${e.createdAt}`} className="px-4 py-2 border-b border-line text-sm flex items-start gap-2">
                  <div className="flex-1">
                    <p className="font-medium capitalize">{e.entity} · {e.action}</p>
                    <p className="text-muted">{e.error}</p>
                  </div>
                  {e.dropped && (
                    <span className="text-[10px] font-bold bg-danger/10 text-danger px-2 py-0.5 rounded-full shrink-0">Descartada</span>
                  )}
                </div>
              ))}
              <div className="px-4 py-2 flex justify-end">
                <button onClick={clearErrors} className="text-xs font-semibold text-danger">Limpar erros</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
