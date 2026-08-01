import type { NormalizedOrder, Platform } from "./types"

function money(v: unknown): number {
  if (v === null || v === undefined) return 0
  if (typeof v === "number") return v
  if (typeof v === "object" && "value" in (v as any)) return Number((v as any).value) || 0
  return Number(v) || 0
}

function asArray(v: unknown): any[] {
  return Array.isArray(v) ? v : []
}

function firstText(...values: unknown[]): string | undefined {
  for (const v of values) {
    const s = typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : undefined
    if (s) return s
  }
  return undefined
}

export function normalize99FoodOrder(details: any): NormalizedOrder {
  const items = asArray(details?.items).map((it: any) => {
    const qty = Number(it?.quantity ?? it?.unit ?? 1) || 1
    const totalPrice = money(it?.totalPrice)
    const price = qty > 0 ? totalPrice / qty : money(it?.unitPrice)
    const options = asArray(it?.options).map((o: any) => o?.name).filter(Boolean).join(", ")
    return {
      name: firstText(it?.name) || "Item 99Food",
      qty,
      price,
      notes: firstText(options, it?.notes) || undefined,
    }
  })

  const fees = asArray(details?.otherFees)
    .filter((f: any) => (f?.receivedBy && f.receivedBy !== "MERCHANT") || ["MARKETPLACE", "PLATFORM_FEE", "COMMISSION"].includes(String(f?.type || "").toUpperCase()))
    .map((f: any) => money(f?.price))
    .reduce((a: number, b: number) => a + b, 0)

  const total = money(details?.totalPrice) || asArray(details?.items).reduce((s: number, it: any) => s + money(it?.totalPrice), 0)
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

export function normalizeIfoodOrder(details: any): NormalizedOrder {
  const items = asArray(details?.items).map((it: any) => {
    const qty = Number(it?.quantity ?? 1) || 1
    const totalPrice = money(it?.totalPrice ?? it?.total)
    const price = qty > 0 ? totalPrice / qty : money(it?.unitPrice)
    const options = asArray(it?.options).map((o: any) => o?.name || o?.label).filter(Boolean).join(", ")
    return {
      name: firstText(it?.name) || "Item iFood",
      qty,
      price,
      notes: firstText(options, it?.observations) || undefined,
    }
  })

  const fees = asArray(details?.otherFees)
    .filter((f: any) => (f?.receivedBy && f.receivedBy !== "MERCHANT") || ["MARKETPLACE", "PLATFORM_FEE", "COMMISSION"].includes(String(f?.type || "").toUpperCase()))
    .map((f: any) => money(f?.amount ?? f?.price))
    .reduce((a: number, b: number) => a + b, 0)

  const total = money(details?.total) || money(details?.orderAmount) || asArray(details?.items).reduce((s: number, it: any) => s + money(it?.totalPrice), 0)
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

export function normalizeOrder(platform: Platform, details: any): NormalizedOrder {
  return platform === "99FOOD" ? normalize99FoodOrder(details) : normalizeIfoodOrder(details)
}
