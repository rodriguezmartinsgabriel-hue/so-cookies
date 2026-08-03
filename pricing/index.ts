// Importações convenientes para Pricing Engine v2

// Tipos principais
export type {
  PricingContext,
  PricingState,
  PricingResult,
  PricingSummary,
  PricingItem,
  Discount,
  Cashback,
  Tax,
  Bonus,
  Warning,
  Log,
  AuditTrail,
  AuditEvent,
  TimelineEvent
} from './types';

// Actions
export {
  PricingAction,
  PricingActionType
} from './actions/PricingAction';

export {
  DiscountAction
} from './actions/DiscountAction';

export {
  ShippingAction
} from './actions/ShippingAction';

export {
  CashbackAction
} from './actions/CashbackAction';

export {
  TaxAction
} from './actions/TaxAction';

export {
  BonusAction
} from './actions/BonusAction';

export {
  WarningAction
} from './actions/WarningAction';

export {
  LogAction
} from './actions/LogAction';

// Repositories
export {
  ProductRepository
} from './repositories/ProductRepository';

export {
  CouponRepository
} from './repositories/CouponRepository';

export {
  CampaignRepository
} from './repositories/CampaignRepository';

export {
  ShippingRepository
} from './repositories/ShippingRepository';

export {
  PricingRepository
} from './repositories/PricingRepository';

// Cache
export {
  PricingCache
} from './cache/PricingCache';

// Registry
export {
  RuleRegistry
} from './registry/RuleRegistry';

// Pipeline
export {
  PricingPhase,
  RulePipeline
} from './pipeline/RulePipeline';

// Executor
export {
  RuleValidator,
  RuleExecutor
} from './executor/RuleExecutor';

// Loader
export {
  PricingDataLoader,
  PricingData
} from './loaders/PricingDataLoader';

// Engine
export {
  PricingEngine
} from './engine/PricingEngine';

export {
  PricingSummaryCalculator
} from './calculations/PricingSummaryCalculator';

// Events
export {
  EventBus,
  PricingEvent,
  PricingEventType
} from './events/EventBus';

// Audit
export {
  PricingAudit
} from './audit/PricingAudit';

// Rules
export {
  PricingRule,
  BasePriceRule,
  PriceTierRule,
  ShippingRule
} from './rules/PricingRule';

// Error types
export {
  PricingRuleError
} from './errors/PricingRuleError';

// Utility functions
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function formatBRL(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
