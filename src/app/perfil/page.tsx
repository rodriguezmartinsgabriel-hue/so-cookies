"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, User, ChevronRight, Package, Pencil, X, Check, Lock } from "lucide-react"
import { CustomerShell } from "@/components/customer/CustomerShell"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { FormField } from "@/components/ui/FormField"

type Profile = {
  id: string
  name: string
  email: string
  phone: string | null
  addressCep?: string | null
  addressStreet?: string | null
  addressNumber?: string | null
  addressComplement?: string | null
  addressNeighborhood?: string | null
  addressCity?: string | null
  addressState?: string | null
  hasPassword?: boolean
}

type AddressState = {
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

const EMPTY_ADDRESS: AddressState = { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" }

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

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editAddress, setEditAddress] = useState<AddressState>(EMPTY_ADDRESS)
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
    setEditAddress({
      cep: profile?.addressCep || "",
      street: profile?.addressStreet || "",
      number: profile?.addressNumber || "",
      complement: profile?.addressComplement || "",
      neighborhood: profile?.addressNeighborhood || "",
      city: profile?.addressCity || "",
      state: profile?.addressState || "",
    })
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
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim() || null,
          addressCep: editAddress.cep.trim() || null,
          addressStreet: editAddress.street.trim() || null,
          addressNumber: editAddress.number.trim() || null,
          addressComplement: editAddress.complement.trim() || null,
          addressNeighborhood: editAddress.neighborhood.trim() || null,
          addressCity: editAddress.city.trim() || null,
          addressState: editAddress.state.trim() || null,
        }),
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
          <Card padded={false} className="text-center py-12">
            <User className="w-8 h-8 mx-auto mb-2 text-muted" />
            <p className="text-muted text-sm">Você não está logado</p>
            <Button variant="primary" size="sm" className="mt-3" onClick={() => router.push("/entrar")}>
              Entrar
            </Button>
          </Card>
        )}

        {!loading && profile && (
          <>
            {message && (
              <div className={`text-sm px-3 py-2 rounded-lg border ${message.type === "ok" ? "bg-success/10 text-success border-success/30" : "bg-danger/10 text-danger border-danger/30"}`}>
                {message.text}
              </div>
            )}

            <Card>
              {editing ? (
                <div className="space-y-3">
                  <FormField label="Nome">
                    <Input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </FormField>
                  <FormField label="Telefone">
                    <Input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="(11) 99999-9999" />
                  </FormField>
                  <div>
                    <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Endereço de entrega</p>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <FormField label="CEP">
                          <Input type="text" inputMode="numeric" value={editAddress.cep} onChange={(e) => setEditAddress({ ...editAddress, cep: e.target.value })} placeholder="00000-000" />
                        </FormField>
                        <div className="col-span-2">
                          <FormField label="Cidade">
                            <Input type="text" value={editAddress.city} onChange={(e) => setEditAddress({ ...editAddress, city: e.target.value })} />
                          </FormField>
                        </div>
                      </div>
                      <FormField label="Rua">
                        <Input type="text" value={editAddress.street} onChange={(e) => setEditAddress({ ...editAddress, street: e.target.value })} />
                      </FormField>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField label="Número">
                          <Input type="text" value={editAddress.number} onChange={(e) => setEditAddress({ ...editAddress, number: e.target.value })} />
                        </FormField>
                        <FormField label="Complemento">
                          <Input type="text" value={editAddress.complement} onChange={(e) => setEditAddress({ ...editAddress, complement: e.target.value })} />
                        </FormField>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <FormField label="Bairro">
                            <Input type="text" value={editAddress.neighborhood} onChange={(e) => setEditAddress({ ...editAddress, neighborhood: e.target.value })} />
                          </FormField>
                        </div>
                        <FormField label="UF">
                          <Input type="text" maxLength={2} placeholder="SP" value={editAddress.state} onChange={(e) => setEditAddress({ ...editAddress, state: e.target.value.toUpperCase() })} />
                        </FormField>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setEditing(false)}
                      disabled={saving}
                    >
                      <X className="w-4 h-4" /> Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      className="flex-1"
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      <Check className="w-4 h-4" /> Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{profile.name}</p>
                      <p className="text-sm text-muted truncate">{profile.email}</p>
                      {profile.phone && <p className="text-sm text-muted">{profile.phone}</p>}
                      {(profile.addressStreet || profile.addressCity) && (
                        <p className="text-sm text-muted mt-0.5">
                          {[profile.addressStreet && profile.addressNumber ? `${profile.addressStreet}, ${profile.addressNumber}` : profile.addressStreet, profile.addressComplement, profile.addressNeighborhood, profile.addressCity && profile.addressState ? `${profile.addressCity} - ${profile.addressState}` : profile.addressCity].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="shrink-0"
                      onClick={startEdit}
                      aria-label="Editar dados"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </Card>

            {profile.hasPassword && (
              <Card className="space-y-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <Lock className="w-4 h-4" /> Alterar senha
                </p>
                <Input type="password" placeholder="Senha atual" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} />
                <Input type="password" placeholder="Nova senha (mínimo 6 caracteres)" value={pwNew} onChange={(e) => setPwNew(e.target.value)} />
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={handleChangePassword}
                  disabled={saving || !pwCurrent || !pwNew}
                >
                  Alterar senha
                </Button>
              </Card>
            )}

            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={handleLogout}
            >
              <span className="text-danger"><LogOut className="w-4 h-4" /> Sair</span>
            </Button>

            <div>
              <p className="text-sm font-semibold text-ink mb-2 flex items-center gap-1.5">
                <Package className="w-4 h-4" /> Meus pedidos
              </p>
              {orders.length === 0 ? (
                <p className="text-sm text-muted text-center py-6">Nenhum pedido ainda</p>
              ) : (
                <div className="space-y-2">
                  {orders.map((o) => (
                    <Button
                      key={o.id}
                      variant="secondary"
                      className="w-full h-auto p-3"
                      onClick={() => router.push(`/pedido/${o.id}`)}
                    >
                      <div className="w-full flex items-center justify-between">
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
                    </Button>
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
