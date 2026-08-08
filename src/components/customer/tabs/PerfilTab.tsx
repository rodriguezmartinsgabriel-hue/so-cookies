"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { User, MapPin, Lock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ProfileHero } from "@/components/customer/ProfileHero"
import { ProfileInfoCard } from "@/components/customer/ProfileInfoCard"
import { ProfileInfoRow } from "@/components/customer/ProfileInfoRow"
import { ProfileSignOut } from "@/components/customer/ProfileSignOut"
import { ProfileSkeleton } from "@/components/customer/ProfileSkeleton"
import { OrderHistoryCard } from "@/components/customer/OrderHistoryCard"
import { EditProfileModal, type EditProfileInput } from "@/components/customer/EditProfileModal"
import { EditPasswordModal } from "@/components/customer/EditPasswordModal"
import { LoyaltySection } from "@/components/customer/LoyaltySection"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/ErrorState"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { useToast } from "@/components/ui/Toast"
import { type AddressState } from "@/lib/customer-types"
import { meQueryKey, useLoyaltyBalance, useMe, useOrders } from "@/hooks/customer/queries"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

export function PerfilTab() {
  const router = useRouter()
  const haptic = useHapticFeedback()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const reducedMotion = useReducedMotion()

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useMe()
  const { data: orders = [] } = useOrders()
  const { data: loyalty } = useLoyaltyBalance()

  const [loggingOut, setLoggingOut] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [editPasswordOpen, setEditPasswordOpen] = useState(false)

  const pontosRef = useRef<HTMLDivElement | null>(null)

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

  const handleSignOut = async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/public/auth/logout", { method: "POST" })
      haptic.success()
      queryClient.clear()
      router.push("/cardapio")
      router.refresh()
    } catch {
      toast("danger", "Não foi possível sair", "Tente novamente em instantes.")
    } finally {
      setLoggingOut(false)
    }
  }

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
    queryClient.setQueryData(meQueryKey, (prev: typeof profile | undefined) =>
      prev ? { ...prev, ...data, hasPassword: prev.hasPassword } : prev,
    )
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

  const handleScrollToPontos = () => {
    const el = document.getElementById("pontos")
    if (!el) return
    el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" })
  }

  const loyaltyBalance = loyalty?.balance ?? 0
  const loyaltyLifetimeEarned = loyalty?.lifetimeEarned ?? 0
  const loyaltyLifetimeSpent = loyalty?.lifetimeSpent ?? 0
  const loyaltyPointsPerReal = loyalty?.pointsPerReal ?? 1
  const loyaltyActive = loyalty?.active ?? true

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <ProfileSkeleton />
        </motion.div>
      ) : isError ? (
        <motion.div
          key="error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <ErrorState
            message="Não foi possível carregar seus dados"
            onRetry={() => refetch()}
          />
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
                balance: loyaltyBalance,
                lifetimeEarned: loyaltyLifetimeEarned,
                lifetimeSpent: loyaltyLifetimeSpent,
                pointsPerReal: loyaltyPointsPerReal,
              }}
              onViewPointsHistory={handleScrollToPontos}
            />
          </motion.div>

          {loyaltyActive && (
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
                <ProfileInfoRow label="Método de login" value="Senha + e-mail" />
              </ProfileInfoCard>
            </motion.div>
          )}

          <motion.div variants={itemVariants}>
            <OrderHistoryCard orders={orders} />
          </motion.div>

          <motion.div variants={itemVariants}>
            <ProfileSignOut onSignOut={handleSignOut} loading={loggingOut} />
          </motion.div>
        </motion.div>
      )}

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
    </AnimatePresence>
  )
}
