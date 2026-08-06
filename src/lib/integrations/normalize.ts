import type { NormalizedOrder, Platform } from "./types"

export type PlatformOrderDetails = {
  id?: unknown
  status?: string
  lastEvent?: string
  items?: unknown[]
  totalPrice?: unknown
  total?: unknown
  orderAmount?: unknown
  otherFees?: unknown[]
  observations?: string
  extraInfo?: string
  customer?: { name?: string; phone?: { number?: string } }
  delivery?: { deliveryAddress?: { formattedAddress?: string } }
}

type PlatformItem = {
  name?: string
  quantity?: unknown
  unit?: unknown
  totalPrice?: unknown
  unitPrice?: unknown
  total?: unknown
  options?: unknown[]
  notes?: string
  observations?: string
}

type PlatformOption = {
  name?: string
  label?: string
}

type PlatformFee = {
  receivedBy?: string
  type?: string
  price?: unknown
  amount?: unknown
}

function money(v: unknown): number {
  if (v === null || v === undefined) return 0
  if (typeof v === "number") return v
  if (typeof v === "object" && "value" in v) return Number(v.value) || 0
  return Number(v) || 0
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

function firstText(...values: unknown[]): string | undefined {
  for (const v of values) {
    const s = typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : undefined
    if (s) return s
  }
  return undefined
}

function itemOptionText(options: unknown[], pick: (o: PlatformOption) => string | undefined): string {
  return asArray<PlatformOption>(options).map(pick).filter(Boolean).join(", ")
}

function platformFeeTotal(fees: unknown[], pick: (f: PlatformFee) => unknown): number {
  return asArray<PlatformFee>(fees)
    .filter(
      (f) =>
        (f?.receivedBy && f.receivedBy !== "MERCHANT") ||
        ["MARKETPLACE", "PLATFORM_FEE", "COMMISSION"].includes(String(f?.type || "").toUpperCase()),
    )
    .map(pick)
    .reduce((a: number, b) => a + money(b), 0)
}

export function normalize99FoodOrder(details: PlatformOrderDetails): NormalizedOrder {
  const items = asArray<PlatformItem>(details?.items).map((it) => {
    const qty = Number(it?.quantity ?? it?.unit ?? 1) || 1
    const totalPrice = money(it?.totalPrice)
    const price = qty > 0 ? totalPrice / qty : money(it?.unitPrice)
    const options = itemOptionText(it?.options ?? [], (o) => o?.name)
    return {
      name: firstText(it?.name) || "Item 99Food",
      qty,
      price,
      notes: firstText(options, it?.notes) || undefined,
    }
  })

  const fees = platformFeeTotal(details?.otherFees ?? [], (f) => f?.price)
  const total =
    money(details?.totalPrice) || asArray<PlatformItem>(details?.items).reduce((s, it) => s + money(it?.totalPrice), 0)
  const customer = firstText(details?.customer?.name) || "Cliente 99"

  return {
    externalId: String(details?.id || ""),
    channel: "99Food",
    customer,
    total,
    notes: firstText(details?.observations, details?.extraInfo) || undefined,
    deliveryAddress: firstText(details?.delivery?.deliveryAddress?.formattedAddress) || undefined,
    customerPhone: firstText(details?.customer?.phone?.number) || undefined,
    platformFee: fees,
    items,
  }
}

export function normalizeIfoodOrder(details: PlatformOrderDetails): NormalizedOrder {
  const items = asArray<PlatformItem>(details?.items).map((it) => {
    const qty = Number(it?.quantity ?? 1) || 1
    const totalPrice = money(it?.totalPrice ?? it?.total)
    const price = qty > 0 ? totalPrice / qty : money(it?.unitPrice)
    const options = itemOptionText(it?.options ?? [], (o) => o?.name || o?.label)
    return {
      name: firstText(it?.name) || "Item iFood",
      qty,
      price,
      notes: firstText(options, it?.observations) || undefined,
    }
  })

  const fees = platformFeeTotal(details?.otherFees ?? [], (f) => f?.amount ?? f?.price)
  const total =
    money(details?.total) ||
    money(details?.orderAmount) ||
    asArray<PlatformItem>(details?.items).reduce((s, it) => s + money(it?.totalPrice), 0)
  const customer = firstText(details?.customer?.name) || "Cliente iFood"

  return {
    externalId: String(details?.id || ""),
    channel: "iFood",
    customer,
    total,
    notes: firstText(details?.observations) || undefined,
    deliveryAddress: firstText(details?.delivery?.deliveryAddress?.formattedAddress) || undefined,
    customerPhone: firstText(details?.customer?.phone?.number) || undefined,
    platformFee: fees,
    items,
  }
}

export function normalizeOrder(platform: Platform, details: PlatformOrderDetails): NormalizedOrder {
  return platform === "99FOOD" ? normalize99FoodOrder(details) : normalizeIfoodOrder(details)
}
