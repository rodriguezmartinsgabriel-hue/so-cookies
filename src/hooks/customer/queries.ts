"use client"

import { useQuery } from "@tanstack/react-query"
import type { CatalogProduct } from "@/lib/utils"
import type { AddressState, DeliverySlot, Profile, PublicOrder } from "@/lib/customer-types"

export interface LoyaltySnapshot {
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

export const catalogQueryKey = ["catalog"] as const
export const meQueryKey = ["me"] as const
export const ordersQueryKey = ["orders"] as const
export const loyaltyBalanceQueryKey = ["loyalty", "balance"] as const
export const loyaltyTransactionsQueryKey = ["loyalty", "transactions"] as const
export const loyaltyRewardsQueryKey = ["loyalty", "rewards"] as const
export const deliverySlotsQueryKey = ["delivery-slots"] as const

export function useCatalog() {
  return useQuery<CatalogProduct[]>({
    queryKey: catalogQueryKey,
    queryFn: async () => {
      const res = await fetch("/api/public/catalog", { cache: "no-store" })
      if (res.status === 401) {
        if (typeof window !== "undefined") {
          const path = window.location.pathname + window.location.search
          window.location.href = `/entrar?next=${encodeURIComponent(path)}`
        }
        throw new Error("unauthorized")
      }
      if (!res.ok) throw new Error("Falha ao carregar catálogo")
      return (await res.json()) as CatalogProduct[]
    },
    staleTime: 60_000,
  })
}

export function useMe() {
  return useQuery<Profile | null>({
    queryKey: meQueryKey,
    queryFn: async () => {
      const res = await fetch("/api/public/auth/me", { cache: "no-store" })
      if (!res.ok) return null
      return (await res.json()) as Profile
    },
    staleTime: 60_000,
  })
}

export function useOrders() {
  return useQuery<PublicOrder[]>({
    queryKey: ordersQueryKey,
    queryFn: async () => {
      const res = await fetch("/api/public/orders", { cache: "no-store" })
      if (!res.ok) return []
      return (await res.json()) as PublicOrder[]
    },
    staleTime: 30_000,
  })
}

export function useLoyaltyBalance() {
  return useQuery<LoyaltySnapshot>({
    queryKey: loyaltyBalanceQueryKey,
    queryFn: async () => {
      const res = await fetch("/api/public/loyalty/balance", { cache: "no-store" })
      if (!res.ok) return DEFAULT_LOYALTY_SNAPSHOT
      const data = (await res.json()) as Partial<LoyaltySnapshot>
      return { ...DEFAULT_LOYALTY_SNAPSHOT, ...data }
    },
    staleTime: 30_000,
  })
}

export function useDeliverySlots(enabled: boolean) {
  return useQuery<{ slots: DeliverySlot[] }>({
    queryKey: deliverySlotsQueryKey,
    enabled,
    queryFn: async () => {
      const res = await fetch("/api/public/delivery-slots", { cache: "no-store" })
      if (res.status === 401) {
        if (typeof window !== "undefined") {
          const path = window.location.pathname + window.location.search
          window.location.href = `/entrar?next=${encodeURIComponent(path)}`
        }
        throw new Error("unauthorized")
      }
      if (!res.ok) throw new Error("Falha ao carregar datas de entrega")
      return (await res.json()) as { slots: DeliverySlot[] }
    },
    staleTime: 60_000,
  })
}

export function buildAddressFromProfile(profile: Profile | null | undefined): AddressState {
  if (!profile) {
    return { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" }
  }
  return {
    cep: profile.addressCep ?? "",
    street: profile.addressStreet ?? "",
    number: profile.addressNumber ?? "",
    complement: profile.addressComplement ?? "",
    neighborhood: profile.addressNeighborhood ?? "",
    city: profile.addressCity ?? "",
    state: profile.addressState ?? "",
  }
}
