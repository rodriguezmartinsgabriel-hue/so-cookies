import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function parseCurrencyPtBr(value: string): number {
  let s = value.replace(/[^\d,.-]/g, "");
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

export function computeMargin(price: number, cost: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0
  if (!Number.isFinite(cost) || cost < 0) return 0
  return Math.round(((price - cost) / price) * 100 * 100) / 100
}

export function formatBRL(value: number): string {
  return `R$ ${(Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const formatCurrency = formatBRL

export function resolveProductImage(
  product: { image?: string | null },
  recipe?: { image?: string | null } | null,
): string | null {
  if (product.image) return product.image
  return recipe?.image || null
}

export interface CatalogProduct {
  id: string
  name: string
  category: string
  price: number
  unit: string
  image: string | null
}

export function toCatalogProduct(product: {
  id: string
  name: string
  category: string
  price: number
  unit: string
  image: string | null
  recipes?: { image: string | null }[]
}): CatalogProduct {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    unit: product.unit,
    image: product.image ?? product.recipes?.[0]?.image ?? null,
  }
}
