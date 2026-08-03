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
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
}

// Cashback (crédito futuro)
export interface Cashback {
  id: string;
  name: string;
  value: number;
  percentage: number;
  expiration?: Date;
  locked: boolean;
  metadata?: Record<string, any>;
}

// Imposto
export interface Tax {
  id: string;
  name: string;
  type: 'ICMS' | 'ISS' | 'NOTA_FISCAL';
  value: number;
  percentage: number;
  metadata?: Record<string, any>;
}

// Brinde
export interface Bonus {
  id: string;
  name: string;
  type: 'PRODUCT' | 'PERCENTAGE';
  value: number;
  appliedItems?: string[];
  metadata?: Record<string, any>;
}

// Aviso/Advertência
export interface Warning {
  id: string;
  type: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  metadata?: Record<string, any>;
}

// Log
export interface Log {
  id: string;
  timestamp: Date;
  ruleId: string;
  ruleName: string;
  actionType: string;
  value: any;
  metadata?: Record<string, any>;
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
  value: any;
  details: Record<string, any>;
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

export interface PricingData {
  products: Record<string, any>;
  customer?: any;
  priceTiers: Record<string, any[]>;
  coupons: any[];
  campaigns: any[];
  shippingRates: any[];
  settings: any;
}
