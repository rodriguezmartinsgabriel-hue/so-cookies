// Contexto de entrada para cálculo de preços
export interface PricingContext {
  customerId?: string
  customerType: "CLIENTE" | "B2B" | "EMPRESA" | "SUBSCRIBER"
  channel: "delivery" | "pickup" | "digital"
  couponCode?: string
  items: Array<{
    productId: string
    qty: number
    basePrice: number
    name?: string
  }>
  metadata?: Record<string, unknown>
}

// Preview informational do programa de pontos que será exibido na UI do cliente.
// Calculado pelo Pricing Engine (fase CUSTOMER) apenas para fins de exibição;
// os pontos SÓ são creditados após confirmação de pagamento via webhook.
export interface LoyaltyPreview {
  currentBalance: number
  pointsToEarn: number
  projectedAfter: number
  active: boolean
  ruleName: string
  /** True quando loyalty está best-effort (ex.: migration ainda não aplicada). */
  degraded?: boolean
}

// Estado transitório do cálculo de preços
export interface PricingState {
  items: PricingItem[]
  discounts: Discount[]
  cashbacks: Cashback[]
  taxes: Tax[]
  bonuses: Bonus[]
  warnings: Warning[]
  logs: Log[]
  blocked: boolean
  blockedReason?: string
  version: string
  shipping?: { cost: number }
  freeShipping?: boolean
  subtotal?: number
  /** Tiers de preço disponíveis por produto (somente leitura, exposto no payload público para a UI). */
  availableTiers?: Record<string, PriceTierView[]>
  /**
   * Tiers compartilhados dos cookies assados (omitidos quando não há nenhum
   * item de cookie assado no carrinho). Como todos os assados compartilham o
   * mesmo conjunto de tiers (ver seed-price-tiers.ts), expomos aqui uma única
   * lista para a UI renderizar uma barra de progresso global somando qtys de
   * todos os sabores. A qty de referência para seleção de faixa é a soma das
   * qtys dos itens de cookie assado, não a qty individual de cada SKU.
   */
  cookieTiers?: PriceTierView[]
  /** Preview do programa de pontos (informational; não altera total). */
  loyaltyPreview?: LoyaltyPreview
}

// Visão pública (read-only) de um PriceTier exposta no payload público.
export interface PriceTierView {
  id: string
  productId: string
  name: string
  minQty: number
  maxQty: number | null
  price: number
}

// Item de preço
export interface PricingItem {
  productId: string
  name: string
  qty: number
  basePrice: number
  calculatedPrice: number
  priceAfterDiscount: number
}

// Desconto
export interface Discount {
  id: string
  name: string
  type: "PERCENTAGE" | "FIXED" | "TIER"
  value: number
  percentage: number
  appliedTo?: "items" | "subtotal"
  metadata?: Record<string, unknown>
}

// Cashback (crédito futuro)
export interface Cashback {
  id: string
  name: string
  value: number
  percentage: number
  expiration?: Date
  locked: boolean
  metadata?: Record<string, unknown>
}

// Imposto
export interface Tax {
  id: string
  name: string
  type: "ICMS" | "ISS" | "NOTA_FISCAL"
  value: number
  percentage: number
  metadata?: Record<string, unknown>
}

// Brinde
export interface Bonus {
  id: string
  name: string
  type: "PRODUCT" | "PERCENTAGE"
  value: number
  appliedItems?: string[]
  metadata?: Record<string, unknown>
}

// Aviso/Advertência
export interface Warning {
  id: string
  type: "INFO" | "WARNING" | "ERROR"
  message: string
  metadata?: Record<string, unknown>
}

// Log
export interface Log {
  id: string
  timestamp: Date
  ruleId: string
  ruleName: string
  actionType: string
  value: unknown
  metadata?: Record<string, unknown>
}

// Resumo para usuário
export interface PricingSummary {
  originalPrice: number
  subtotal: number
  discountTotal: number
  cashbackTotal: number
  shippingTotal: number
  taxTotal: number
  total: number
  discountPercent: number
  rulesApplied: string[]
  executionTime: number
}

// Resultado completo do cálculo
export interface PricingResult {
  state: PricingState
  total: number
  summary: PricingSummary
  auditTrail: AuditTrail
}

// Auditoria completa
export interface AuditTrail {
  events: AuditEvent[]
  timeline: TimelineEvent[]
}

// Evento de auditoria
export interface AuditEvent {
  timestamp: Date
  ruleId: string
  ruleName: string
  actionType: string
  target: string
  value: unknown
  details: Record<string, unknown>
}

// Evento de timeline (por fase)
export interface TimelineEvent {
  timestamp: Date
  phase: string
  phaseIndex: number
  events: string[]
  totalDiscount: number
  totalSubtotal: number
}

import type { Product, Customer, Coupon, Campaign, ShippingRate, PriceTier } from "@/generated/prisma/client"

// Logger mínimo aceito pelo Pricing Engine (compatível com console e mocks)
export interface Logger {
  log(...args: unknown[]): void
  error(...args: unknown[]): void
  warn?(...args: unknown[]): void
  info?(...args: unknown[]): void
  debug?(...args: unknown[]): void
}

// Coleta de métricas do Pricing Engine
export interface Metrics {
  record(category: string, metric: string, value: number): void
}

// Configuração de precificação por canal (flags de ativação + parâmetros)
export interface ChannelConfig {
  id: string
  activatePriceTier: boolean
  activateCoupon: boolean
  activateCampaign: boolean
  activateB2B: boolean
  activateFreeShipping: boolean
  b2bDiscountPercent: number
  activateLoyalty: boolean
  pointsPerReal: number
  minOrderTotalForPoints: number
  roundingMode: "FLOOR" | "CEIL" | "ROUND"
}

export interface PricingData {
  products: Record<string, Product>
  customer?: Customer | null
  priceTiers: Record<string, PriceTier[]>
  coupons: Coupon[]
  campaigns: Campaign[]
  shippingRates: ShippingRate[]
  settings: ChannelConfig
  /** Saldo atual de pontos do cliente (somente leitura; sem efeitos colaterais no engine). */
  loyaltyBalance: number
  /** True quando a leitura do loyalty falhou (ex.: tabela inexistente antes da migration). */
  loyaltyDegraded: boolean
}
