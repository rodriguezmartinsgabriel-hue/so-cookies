"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { repository } from "@/lib/repository"
import { db } from "@/lib/db-local"
import { ChefHat, Clock, CheckCircle } from "lucide-react"

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  concluido: { label: "Concluído", color: "text-success bg-success/10", icon: CheckCircle },
  em_producao: { label: "Em Produção", color: "text-warning bg-warning/10", icon: ChefHat },
  pendente: { label: "Pendente", color: "text-muted bg-cream", icon: Clock },
}

export default function ProducaoPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadProductions() }, [])

  async function loadProductions() {
    setLoading(true)
    try {
      if (navigator.onLine) {
        const resp = await fetch("/api/productions")
        if (resp.ok) {
          const data = await resp.json()
          await db.productions.bulkPut(data.map((p: any) => ({ ...p, _synced: true, _updatedAt: new Date().toISOString() })))
          setBatches(data)
          setLoading(false)
          return
        }
      }
    } catch {}
    const local = await db.productions.toArray()
    setBatches(local)
    setLoading(false)
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const endTime = newStatus === "concluido" ? new Date().toISOString() : undefined
    await repository.productions.updateStatus(id, newStatus, endTime)
    await loadProductions()
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink">Produção</h1>
          <button className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
            <ChefHat className="w-4 h-4" />
            Novo Lote
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted">Carregando...</div>
        ) : (
          <div className="space-y-2">
            {batches.map((batch: any) => {
              const cfg = statusConfig[batch.status] || statusConfig.pendente
              const Icon = cfg.icon
              return (
                <div key={batch.id} className="border border-line rounded-lg bg-paper p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center">
                        <Icon className="w-5 h-5 text-muted" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{batch.product?.name || batch.batchCode}</p>
                        <p className="text-xs text-muted">Lote {batch.batchCode} · {batch.qty} unidades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      <div className="flex gap-1 mt-2">
                        {batch.status === "pendente" && (
                          <button onClick={() => handleStatusChange(batch.id, "em_producao")} className="text-xs px-2 py-1 bg-warning/10 text-warning rounded hover:bg-warning/20 transition-colors">Iniciar</button>
                        )}
                        {batch.status === "em_producao" && (
                          <button onClick={() => handleStatusChange(batch.id, "concluido")} className="text-xs px-2 py-1 bg-success/10 text-success rounded hover:bg-success/20 transition-colors">Concluir</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {batches.length === 0 && (
              <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">Nenhum lote em produção</div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}