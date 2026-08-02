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
