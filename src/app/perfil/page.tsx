"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, User, ChevronRight, Package } from "lucide-react"
import { CustomerShell } from "@/components/customer/CustomerShell"

type Profile = {
  id: string
  name: string
  email: string
  phone: string | null
}

type PublicOrderItem = {
  id: string
  qty: number
  price: number
  product: { id: string; name: string } | null
  name: string | null
}

type PublicOrder = {
  id: string
  status: string
  total: number
  pickupCode: string | null
  createdAt: string
  items: PublicOrderItem[]
}

const statusLabel: Record<string, string> = {
  PENDENTE: "Recebido",
  CONFIRMADO: "Confirmado",
  PRODUCAO: "Em produção",
  PRONTO: "Pronto",
  ENTREGA: "Em entrega",
  CONCLUIDO: "Finalizado",
  CANCELADO: "Cancelado",
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default function PerfilPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<PublicOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/public/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/public/orders").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([me, myOrders]) => {
        setProfile(me)
        setOrders(myOrders)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleLogout() {
    await fetch("/api/public/auth/logout", { method: "POST" })
    router.push("/cardapio")
    router.refresh()
  }

  return (
    <CustomerShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Minha conta</h1>
        </div>

        {loading && <div className="text-center py-12 text-muted">Carregando...</div>}

        {!loading && !profile && (
          <div className="text-center py-12 border border-dashed border-line rounded-lg">
            <User className="w-8 h-8 mx-auto mb-2 text-muted" />
            <p className="text-muted text-sm">Você não está logado</p>
            <button
              onClick={() => router.push("/entrar")}
              className="mt-3 text-sm px-4 py-2 bg-ink text-paper rounded-lg font-medium hover:bg-ink/90 transition-colors"
            >
              Entrar
            </button>
          </div>
        )}

        {!loading && profile && (
          <>
            <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
              <p className="font-semibold text-ink">{profile.name}</p>
              <p className="text-sm text-muted">{profile.email}</p>
              {profile.phone && <p className="text-sm text-muted">{profile.phone}</p>}
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full h-11 border border-line rounded-lg text-danger font-medium hover:bg-danger/5 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>

            <div>
              <p className="text-sm font-semibold text-ink mb-2 flex items-center gap-1.5">
                <Package className="w-4 h-4" /> Meus pedidos
              </p>
              {orders.length === 0 ? (
                <p className="text-sm text-muted text-center py-6">Nenhum pedido ainda</p>
              ) : (
                <div className="space-y-2">
                  {orders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => router.push(`/pedido/${o.id}`)}
                      className="w-full text-left border border-line rounded-lg bg-paper p-3 shadow-card hover:bg-cream transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            #{o.id.slice(0, 6)} · {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                          <p className="text-xs text-muted">
                            {o.items.reduce((s, i) => s + i.qty, 0)} itens · {formatBRL(o.total)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-ink">{statusLabel[o.status]}</span>
                          <ChevronRight className="w-4 h-4 text-muted" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </CustomerShell>
  )
}
