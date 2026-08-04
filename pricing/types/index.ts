// Contexto de entrada para cálculo de preços
export interface PricingContext {
  customerId?: string;
  customerType: 'CLIENTE' | 'B2B' | 'EMPRESA' | 'SUBSCRIBER';
  channel: 'delivery' | 'pickup' | 'digital';
  couponCode?: string;
  items: Array<{
    productId: string;
    qty: number;
    basePrice: number;
    name?: string;
  }>;
  metadata?: Record<string, unknown>;
}

// Estado transitório do cálculo de preços
export interface PricingState {
  items: PricingItem[];
  discounts: Discount[];
  cashbacks: Cashback[];
  taxes: Tax[];
  bonuses: Bonus[];
  warnings: Warning[];
  logs: Log[];
  blocked: boolean;
  blockedReason?: string;
  version: string;
  shipping?: { cost: number };
  subtotal?: number;
}

// Item de preço
export interface PricingItem {
  productId: string;
  name: string;
  qty: number;
  basePrice: number;
  calculatedPrice: number;
  priceAfterDiscount: number;
}

// Desconto
export interface Discount {
  id: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED' | 'TIER';
  value: number;
  percentage: number;
  appliedTo?: 'items' | 'subtotal';
  metadata?: Record<string, unknown>;
}

// Cashback (crédito futuro)
export interface Cashback {
  id: string;
  name: string;
  value: number;
  percentage: number;
  expiration?: Date;
  locked: boolean;
  metadata?: Record<string, unknown>;
}

// Imposto
export interface Tax {
  id: string;
  name: string;
  type: 'ICMS' | 'ISS' | 'NOTA_FISCAL';
  value: number;
  percentage: number;
  metadata?: Record<string, unknown>;
}

// Brinde
export interface Bonus {
  id: string;
  name: string;
  type: 'PRODUCT' | 'PERCENTAGE';
  value: number;
  appliedItems?: string[];
  metadata?: Record<string, unknown>;
}

// Aviso/Advertência
export interface Warning {
  id: string;
  type: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  metadata?: Record<string, unknown>;
}

// Log
export interface Log {
  id: string;
  timestamp: Date;
  ruleId: string;
  ruleName: string;
  actionType: string;
  value: unknown;
  metadata?: Record<string, unknown>;
}

// Resumo para usuário
export interface PricingSummary {
  originalPrice: number;
  subtotal: number;
  discountTotal: number;
  cashbackTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  discountPercent: number;
  rulesApplied: string[];
  executionTime: number;
}

// Resultado completo do cálculo
export interface PricingResult {
  state: PricingState;
  total: number;
  summary: PricingSummary;
  auditTrail: AuditTrail;
}

// Auditoria completa
export interface AuditTrail {
  events: AuditEvent[];
  timeline: TimelineEvent[];
}

// Evento de auditoria
export interface AuditEvent {
  timestamp: Date;
  ruleId: string;
  ruleName: string;
  actionType: string;
  target: string;
  value: unknown;
  details: Record<string, unknown>;
}

// Evento de timeline (por fase)
export interface TimelineEvent {
  timestamp: Date;
  phase: string;
  phaseIndex: number;
  events: string[];
  totalDiscount: number;
  totalSubtotal: number;
}

import type { Product, Customer, Coupon, Campaign, ShippingRate, PricingSettings, PriceTier } from '@/generated/prisma/client';

// Logger mínimo aceito pelo Pricing Engine (compatível com console e mocks)
export interface Logger {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  warn?(...args: unknown[]): void;
  info?(...args: unknown[]): void;
  debug?(...args: unknown[]): void;
}

// Coleta de métricas do Pricing Engine
export interface Metrics {
  record(category: string, metric: string, value: number): void;
}

export interface PricingData {
  products: Record<string, Product>;
  customer?: Customer | null;
  priceTiers: Record<string, PriceTier[]>;
  coupons: Coupon[];
  campaigns: Campaign[];
  shippingRates: ShippingRate[];
  settings: PricingSettings | null;
}






