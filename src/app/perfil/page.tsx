"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { User, MapPin, Lock, Package, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { CustomerShell } from "@/components/customer/CustomerShell"
import { ProfileHero } from "@/components/customer/ProfileHero"
import { ProfileInfoCard } from "@/components/customer/ProfileInfoCard"
import { ProfileInfoRow } from "@/components/customer/ProfileInfoRow"
import { ProfileSignOut } from "@/components/customer/ProfileSignOut"
import { ProfileSkeleton } from "@/components/customer/ProfileSkeleton"
import { EditProfileModal, type EditProfileInput } from "@/components/customer/EditProfileModal"
import { EditPasswordModal } from "@/components/customer/EditPasswordModal"
import { LoyaltySection } from "@/components/customer/LoyaltySection"
import { Button } from "@/components/ui/Button"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"
import { useToast } from "@/components/ui/Toast"
import { useCart } from "@/hooks/useCart"
import { formatBRL } from "@/lib/utils"
import { type AddressState, type Profile, type PublicOrder, statusLabel } from "@/lib/customer-types"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

interface LoyaltySnapshot {
  balance: number
  lifetimeEarned: number
  lifetimeSpent: number
  pointsPerReal: number
  active: boolean
}

const DEFAULT_LOYALTY_SNAPSHOT: LoyaltySnapshot = {
  balance: 0,
  lifetimeEarned: 0,
  lifetimeSpent: 0,
  pointsPerReal: 1,
  active: true,
}

export default function PerfilPage() {
  const router = useRouter()
  const haptic = useHapticFeedback()
  const { toast } = useToast()
  const { count } = useCart()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<PublicOrder[]>([])
  const [loyalty, setLoyalty] = useState<LoyaltySnapshot>(DEFAULT_LOYALTY_SNAPSHOT)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [editPasswordOpen, setEditPasswordOpen] = useState(false)

  const pontosRef = useRef<HTMLDivElement | null>(null)

  const loadAll = useCallback(async () => {
    try {
      const [meRes, ordersRes, loyaltyRes] = await Promise.all([
        fetch("/api/public/auth/me"),
        fetch("/api/public/orders"),
        fetch("/api/public/loyalty/balance").catch(() => null),
      ])
      const me = meRes.ok ? await meRes.json() : null
      const myOrders = ordersRes.ok ? await ordersRes.json() : []
      let loyaltyData: LoyaltySnapshot = DEFAULT_LOYALTY_SNAPSHOT
      if (loyaltyRes && loyaltyRes.ok) {
        try {
          loyaltyData = (await loyaltyRes.json()) as LoyaltySnapshot
        } catch {
          loyaltyData = DEFAULT_LOYALTY_SNAPSHOT
        }
      }
      setProfile(me)
      setOrders(myOrders)
      setLoyalty({ ...DEFAULT_LOYALTY_SNAPSHOT, ...loyaltyData })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const addressValue = useMemo(() => {
    if (!profile) return []
    return [
      profile.addressStreet && profile.addressNumber
        ? `${profile.addressStreet}, ${profile.addressNumber}`
        : profile.addressStreet,
      profile.addressComplement,
      profile.addressNeighborhood,
      profile.addressCity && profile.addressState
        ? `${profile.addressCity} - ${profile.addressState}`
        : profile.addressCity,
    ].filter(Boolean)
  }, [profile])

  const editInitial: EditProfileInput | null = useMemo(() => {
    if (!profile) return null
    return {
      name: profile.name || "",
      phone: profile.phone ?? null,
      address: {
        cep: profile.addressCep ?? "",
        street: profile.addressStreet ?? "",
        number: profile.addressNumber ?? "",
        complement: profile.addressComplement ?? "",
        neighborhood: profile.addressNeighborhood ?? "",
        city: profile.addressCity ?? "",
        state: profile.addressState ?? "",
      } as AddressState,
    }
  }, [profile])

  const handleSignOut = useCallback(async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/public/auth/logout", { method: "POST" })
      haptic.success()
      router.push("/cardapio")
      router.refresh()
    } catch {
      toast("danger", "Não foi possível sair", "Tente novamente em instantes.")
    } finally {
      setLoggingOut(false)
    }
  }, [haptic, router, toast])

  async function handleSaveProfile(input: EditProfileInput) {
    const resp = await fetch("/api/public/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        phone: input.phone,
        addressCep: input.address.cep,
        addressStreet: input.address.street,
        addressNumber: input.address.number,
        addressComplement: input.address.complement,
        addressNeighborhood: input.address.neighborhood,
        addressCity: input.address.city,
        addressState: input.address.state,
      }),
    })
    const data = await resp.json().catch(() => null)
    if (!resp.ok) {
      throw new Error(data?.error || "Não foi possível salvar os dados.")
    }
    setProfile((prev) => (prev ? { ...prev, ...data, hasPassword: prev.hasPassword } : prev))
    toast("success", "Dados atualizados", "Suas informações foram salvas com sucesso.")
    haptic.success()
  }

  async function handleChangePassword(params: { currentPassword: string; newPassword: string }) {
    const resp = await fetch("/api/public/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
    const data = await resp.json().catch(() => null)
    if (!resp.ok) {
      throw new Error(data?.error || "Não foi possível alterar a senha.")
    }
    toast("success", "Senha alterada", "Sua senha foi atualizada com sucesso.")
    haptic.success()
  }

  const handleScrollToPontos = useCallback(() => {
    const el = document.getElementById("pontos")
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  return (
    <CustomerShell cartCount={count}>
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <ProfileSkeleton />
          </motion.div>
        ) : !profile ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12 space-y-3"
          >
            <User className="w-10 h-10 mx-auto text-muted" />
            <p className="text-muted text-sm">Você não está logado</p>
            <Button variant="primary" size="md" onClick={() => router.push("/entrar")}>
              Entrar na conta
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="loaded"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <motion.div variants={itemVariants}>
              <ProfileHero
                name={profile.name || ""}
                email={profile.email}
                phone={profile.phone}
                points={{
                  balance: loyalty.balance,
                  lifetimeEarned: loyalty.lifetimeEarned,
                  lifetimeSpent: loyalty.lifetimeSpent,
                  pointsPerReal: loyalty.pointsPerReal,
                }}
                onViewPointsHistory={handleScrollToPontos}
              />
            </motion.div>

            {loyalty.active && (
              <motion.div ref={pontosRef} variants={itemVariants}>
                <LoyaltySection />
              </motion.div>
            )}

            <motion.div variants={itemVariants}>
              <ProfileInfoCard
                icon={<User className="w-4 h-4" />}
                eyebrow="Identidade"
                title="Dados pessoais"
                action={{
                  label: "Editar",
                  onClick: () => {
                    haptic.tap()
                    setEditProfileOpen(true)
                  },
                  ariaLabel: "Editar dados pessoais e endereço",
                }}
              >
                <ProfileInfoRow label="Nome" value={profile.name} />
                <ProfileInfoRow label="Telefone" value={profile.phone} />
                <ProfileInfoRow label="E-mail" value={profile.email} />
              </ProfileInfoCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <ProfileInfoCard
                icon={<MapPin className="w-4 h-4" />}
                eyebrow="Entrega"
                title="Endereço"
                action={{
                  label: "Editar",
                  onClick: () => {
                    haptic.tap()
                    setEditProfileOpen(true)
                  },
                  ariaLabel: "Editar endereço de entrega",
                }}
              >
                <ProfileInfoRow
                  label="Endereço"
                  value={addressValue.length > 0 ? addressValue.join(" · ") : undefined}
                />
                {addressValue.length > 1 && (
                  <ProfileInfoRow label="Localidade" value={`${addressValue.slice(-1).join("")}`} />
                )}
              </ProfileInfoCard>
            </motion.div>

            {profile.hasPassword && (
              <motion.div variants={itemVariants}>
                <ProfileInfoCard
                  icon={<Lock className="w-4 h-4" />}
                  eyebrow="Acesso"
                  title="Segurança"
                  action={{
                    label: "Alterar senha",
                    emphasis: true,
                    onClick: () => {
                      haptic.tap()
                      setEditPasswordOpen(true)
                    },
                    ariaLabel: "Alterar senha",
                  }}
                >
                  <ProfileInfoRow
                    label="Método de login"
                    value="Senha + e-mail"
                  />
                </ProfileInfoCard>
              </motion.div>
            )}

            <motion.div variants={itemVariants}>
              <ProfileInfoCard
                icon={<Package className="w-4 h-4" />}
                eyebrow="Histórico"
                title="Meus pedidos"
              >
                {orders.length === 0 ? (
                  <div className="px-5 py-6 text-center">
                    <p className="text-sm text-muted">Nenhum pedido ainda</p>
                    <p className="text-xs text-muted mt-1">
                      Seus pedidos confirmados vão aparecer aqui.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-line/30">
                    {orders.slice(0, 5).map((o) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-cream/50
                                     transition-colors cursor-pointer text-left"
                          onClick={() => {
                            haptic.tap()
                            router.push(`/pedido/${o.id}`)
                          }}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink truncate">
                              #{o.id.slice(0, 6)} · {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                            </p>
                            <p className="text-xs text-muted">
                              {o.items.reduce((s, i) => s + i.qty, 0)} itens · {formatBRL(o.total)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-medium text-ink">{statusLabel[o.status]}</span>
                            <ChevronRight className="w-4 h-4 text-muted" />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </ProfileInfoCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <ProfileSignOut onSignOut={handleSignOut} loading={loggingOut} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {profile && editInitial && (
        <EditProfileModal
          open={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          initial={editInitial}
          onSubmit={handleSaveProfile}
        />
      )}
      {profile && (
        <EditPasswordModal
          open={editPasswordOpen}
          onClose={() => setEditPasswordOpen(false)}
          onSubmit={handleChangePassword}
        />
      )}
    </CustomerShell>
  )
}
