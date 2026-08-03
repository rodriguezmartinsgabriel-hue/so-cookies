"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, User, ChevronRight, Package, Pencil, X, Check, Lock } from "lucide-react"
import { CustomerShell } from "@/components/customer/CustomerShell"

type Profile = {
  id: string
  name: string
  email: string
  phone: string | null
  hasPassword?: boolean
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

const inputClass = "w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"

export default function PerfilPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<PublicOrder[]>([])
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [pwCurrent, setPwCurrent] = useState("")
  const [pwNew, setPwNew] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)

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

  function startEdit() {
    setEditName(profile?.name || "")
    setEditPhone(profile?.phone || "")
    setMessage(null)
    setEditing(true)
  }

  async function handleSaveProfile() {
    if (!profile) return
    setSaving(true)
    setMessage(null)
    try {
      const resp = await fetch("/api/public/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), phone: editPhone.trim() || null }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setMessage({ type: "err", text: data.error || "Erro ao atualizar" })
        return
      }
      setProfile({ ...data, hasPassword: profile.hasPassword })
      setEditing(false)
      setMessage({ type: "ok", text: "Dados atualizados." })
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    setSaving(true)
    setMessage(null)
    try {
      const resp = await fetch("/api/public/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setMessage({ type: "err", text: data.error || "Erro ao alterar senha" })
        return
      }
      setPwCurrent("")
      setPwNew("")
      setMessage({ type: "ok", text: "Senha alterada." })
    } finally {
      setSaving(false)
    }
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
            {message && (
              <div className={`text-sm px-3 py-2 rounded-lg border ${message.type === "ok" ? "bg-success/10 text-success border-success/30" : "bg-danger/10 text-danger border-danger/30"}`}>
                {message.text}
              </div>
            )}

            <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Telefone</label>
                    <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="(11) 99999-9999" className={inputClass} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(false)}
                      disabled={saving}
                      className="flex items-center justify-center gap-1.5 h-10 px-3 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors"
                    >
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex items-center justify-center gap-1.5 flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{profile.name}</p>
                      <p className="text-sm text-muted truncate">{profile.email}</p>
                      {profile.phone && <p className="text-sm text-muted">{profile.phone}</p>}
                    </div>
                    <button
                      onClick={startEdit}
                      aria-label="Editar dados"
                      className="shrink-0 p-2 rounded-lg border border-line text-muted hover:bg-cream transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {profile.hasPassword && (
              <div className="border border-line rounded-lg bg-paper p-4 shadow-card space-y-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <Lock className="w-4 h-4" /> Alterar senha
                </p>
                <input type="password" placeholder="Senha atual" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} className={inputClass} />
                <input type="password" placeholder="Nova senha (mínimo 6 caracteres)" value={pwNew} onChange={(e) => setPwNew(e.target.value)} className={inputClass} />
                <button
                  onClick={handleChangePassword}
                  disabled={saving || !pwCurrent || !pwNew}
                  className="w-full h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
                >
                  Alterar senha
                </button>
              </div>
            )}

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
