"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, User, MapPin, Phone, Mail, Lock, Package, Pencil, ChevronRight, AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { CustomerShell } from "@/components/customer/CustomerShell"
import { ProfileHeader } from "@/components/customer/ProfileHeader"
import { ProfileSection } from "@/components/customer/ProfileSection"
import { ProfileRow } from "@/components/customer/ProfileRow"
import { ProfileEditList } from "@/components/customer/ProfileEditList"
import { AddressForm } from "@/components/customer/AddressForm"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { FormField } from "@/components/ui/FormField"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"
import { useCart } from "@/hooks/useCart"
import { formatBRL } from "@/lib/utils"
import { EMPTY_ADDRESS, type AddressState, type Profile, type PublicOrder, statusLabel } from "@/lib/customer-types"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function PerfilPage() {
  const router = useRouter()
  const haptic = useHapticFeedback()
  const { count } = useCart()
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

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
    haptic.tap()
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
      haptic.success()
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
      haptic.success()
    } finally {
      setSaving(false)
    }
  }

  const addressValue = [
    profile?.addressStreet && profile?.addressNumber
      ? `${profile.addressStreet}, ${profile.addressNumber}`
      : profile?.addressStreet,
    profile?.addressComplement,
    profile?.addressNeighborhood,
    profile?.addressCity && profile?.addressState
      ? `${profile.addressCity} - ${profile.addressState}`
      : profile?.addressCity,
  ].filter(Boolean)

  const editFields = [
    {
      label: "Nome",
      name: "name",
      value: editName,
      onChange: setEditName,
      placeholder: "Seu nome",
      autoComplete: "name",
    },
    {
      label: "Telefone",
      name: "phone",
      value: editPhone,
      onChange: setEditPhone,
      placeholder: "(11) 99999-9999",
      autoComplete: "tel",
      type: "tel",
    },
    {
      label: "CEP",
      name: "cep",
      value: editAddress.cep,
      onChange: (v: string) => setEditAddress({ ...editAddress, cep: v }),
      placeholder: "00000-000",
      autoComplete: "postal-code",
      type: "tel",
      inputMode: "numeric" as const,
    },
    {
      label: "Cidade",
      name: "city",
      value: editAddress.city,
      onChange: (v: string) => setEditAddress({ ...editAddress, city: v }),
      autoComplete: "address-level2",
    },
    {
      label: "Rua",
      name: "street",
      value: editAddress.street,
      onChange: (v: string) => setEditAddress({ ...editAddress, street: v }),
      autoComplete: "address-line1",
    },
    {
      label: "Número",
      name: "number",
      value: editAddress.number,
      onChange: (v: string) => setEditAddress({ ...editAddress, number: v }),
      autoComplete: "address-line2",
    },
    {
      label: "Complemento",
      name: "complement",
      value: editAddress.complement,
      onChange: (v: string) => setEditAddress({ ...editAddress, complement: v }),
      autoComplete: "address-line2",
    },
    {
      label: "Bairro",
      name: "neighborhood",
      value: editAddress.neighborhood,
      onChange: (v: string) => setEditAddress({ ...editAddress, neighborhood: v }),
      autoComplete: "off",
    },
    {
      label: "UF",
      name: "state",
      value: editAddress.state,
      onChange: (v: string) => setEditAddress({ ...editAddress, state: v.toUpperCase() }),
      maxLength: 2,
      autoComplete: "address-level1",
    },
  ]

  const quickFillAddress = () => {
    if (profile?.addressStreet && profile?.addressNumber) {
      setEditAddress({
        cep: profile.addressCep || "",
        street: profile.addressStreet,
        number: profile.addressNumber,
        complement: profile.addressComplement || "",
        neighborhood: profile.addressNeighborhood || "",
        city: profile.addressCity || "",
        state: profile.addressState || "",
      })
      haptic.tap()
    }
  }

  return (
    <CustomerShell cartCount={count}>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
        <motion.div variants={itemVariants}>
          <ProfileHeader
            name={editing ? editName : profile?.name || ""}
            email={profile?.email || ""}
            phone={editing ? editPhone : profile?.phone}
          />
        </motion.div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" variants={itemVariants} className="text-center py-12 text-muted">
              Carregando...
            </motion.div>
          ) : !profile ? (
            <motion.div key="empty" variants={itemVariants}>
              <div className="text-center py-12">
                <User className="w-8 h-8 mx-auto mb-2 text-muted" />
                <p className="text-muted text-sm">Você não está logado</p>
                <Button variant="primary" size="sm" className="mt-3" onClick={() => router.push("/entrar")}>
                  Entrar
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="loaded" variants={containerVariants} initial="hidden" animate="visible">
              {message && (
                <motion.div
                  key="message"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm px-3 py-2 rounded-lg border ${message.type === "ok" ? "bg-success/10 text-success border-success/30" : "bg-danger/10 text-danger border-danger/30"}`}
                >
                  {message.text}
                </motion.div>
              )}

              <motion.div variants={itemVariants}>
                <ProfileSection icon={<Phone className="w-4 h-4" />} title="Dados Pessoais">
                  {editing ? (
                    <ProfileEditList
                      fields={editFields}
                      onCancel={() => setEditing(false)}
                      onSave={handleSaveProfile}
                      saving={saving}
                    />
                  ) : (
                    <>
                      <ProfileRow icon={<Phone className="w-4 h-4" />} label="Telefone" value={profile.phone || "—"} />
                      <ProfileRow icon={<Mail className="w-4 h-4" />} label="E-mail" value={profile.email} />
                      <ProfileRow icon={<Pencil className="w-4 h-4" />} label="Editar dados" onClick={startEdit} />
                    </>
                  )}
                </ProfileSection>
              </motion.div>

              <motion.div variants={itemVariants}>
                <ProfileSection icon={<MapPin className="w-4 h-4" />} title="Endereço de Entrega">
                  {editing ? (
                    <>
                      <AddressForm address={editAddress} onChange={setEditAddress} showOptionalFields={false} />
                      <div className="px-4 mt-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          onClick={quickFillAddress}
                          disabled={!profile?.addressStreet || !profile?.addressNumber}
                        >
                          <MapPin className="w-4 h-4" />
                          Usar endereço salvo
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {addressValue.length > 0 ? (
                        <ProfileRow label="Endereço" value={addressValue.join(" · ")} />
                      ) : (
                        <ProfileRow label="Endereço" value="Não informado" />
                      )}
                    </>
                  )}
                </ProfileSection>
              </motion.div>

              {profile.hasPassword && (
                <motion.div variants={itemVariants}>
                  <ProfileSection icon={<Lock className="w-4 h-4" />} title="Segurança">
                    <div className="divide-y divide-line/50">
                      <div className="px-4 py-3">
                        <FormField label="Senha atual">
                          <Input
                            type="password"
                            autoComplete="current-password"
                            placeholder="Senha atual"
                            value={pwCurrent}
                            onChange={(e) => setPwCurrent(e.target.value)}
                          />
                        </FormField>
                      </div>
                      <div className="px-4 py-3">
                        <FormField label="Nova senha">
                          <Input
                            type="password"
                            autoComplete="new-password"
                            placeholder="Mínimo 6 caracteres"
                            value={pwNew}
                            onChange={(e) => setPwNew(e.target.value)}
                          />
                        </FormField>
                      </div>
                      <div className="px-4 py-3">
                        <Button
                          variant="primary"
                          size="md"
                          className="w-full"
                          onClick={handleChangePassword}
                          disabled={saving || !pwCurrent || !pwNew}
                        >
                          Alterar senha
                        </Button>
                      </div>
                    </div>
                  </ProfileSection>
                </motion.div>
              )}

              <motion.div variants={itemVariants}>
                <ProfileSection icon={<Package className="w-4 h-4" />} title="Meus Pedidos">
                  {orders.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-muted">Nenhum pedido ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {orders.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-line/30 transition-colors cursor-pointer"
                          onClick={() => {
                            haptic.tap()
                            router.push(`/pedido/${o.id}`)
                          }}
                        >
                          <div>
                            <p className="text-sm font-semibold text-ink">
                              #{o.id.slice(0, 6)} · {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                            </p>
                            <p className="text-xs text-muted">
                              {o.items.reduce((s, i) => s + i.qty, 0)} itens · {formatBRL(o.total)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-medium text-ink">{statusLabel[o.status]}</span>
                            <ChevronRight className="w-4 h-4 text-muted" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ProfileSection>
              </motion.div>

              <motion.div variants={itemVariants} className="pt-2 pb-4">
                {!showLogoutConfirm ? (
                  <Button variant="secondary" size="md" className="w-full" onClick={() => setShowLogoutConfirm(true)}>
                    <span className="text-danger">
                      <LogOut className="w-4 h-4" /> Sair
                    </span>
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-danger/30 bg-danger/5">
                    <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
                    <p className="text-sm text-ink flex-1">
                      Tem certeza que deseja sair? Esta ação não pode ser desfeita.
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => setShowLogoutConfirm(false)}>
                      Voltar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-danger text-paper hover:bg-danger/90"
                      onClick={handleLogout}
                      disabled={saving}
                    >
                      Sair
                    </Button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </CustomerShell>
  )
}
