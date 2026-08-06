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
  TimelineEvent,
} from "./types"

// Actions
export type { PricingAction, PricingActionType } from "./actions/PricingAction"

// Repositories
export { ProductRepository } from "./repositories/ProductRepository"

export { CouponRepository } from "./repositories/CouponRepository"

export { CampaignRepository } from "./repositories/CampaignRepository"

export { ShippingRepository } from "./repositories/ShippingRepository"

export { PricingRepository } from "./repositories/PricingRepository"

// Cache
export { PricingCache } from "./cache/PricingCache"

// Registry
export { RuleRegistry } from "./registry/RuleRegistry"

// Pipeline
export { PricingPhase } from "./pipeline/PricingPhase"

// Executor
export { RuleExecutor } from "./executor/RuleExecutor"

// Loader
export { PricingDataLoader } from "./loaders/PricingDataLoader"

export type { PricingData } from "./types"

// Engine
export { PricingEngine } from "./engine/PricingEngine"

export { PricingSummaryCalculator } from "./calculations/PricingSummaryCalculator"

// Events
export { EventBus } from "./events/EventBus"
export type { PricingEvent, PricingEventType } from "./events/EventBus"

// Audit
export { PricingAudit } from "./audit/PricingAudit"

// Rules
export type { PricingRule } from "./rules/PricingRule"
export { BasePriceRule } from "./rules/PricingRule"
export { PriceTierRule } from "./rules/PriceTierRule"
export { CouponRule } from "./rules/CouponRule"
export { CampaignRule } from "./rules/CampaignRule"
export { B2BRule } from "./rules/B2BRule"
export { ShippingRule } from "./rules/ShippingRule"

// Factory
export { buildPricingEngine } from "./factory"
export type { BuildPricingEngineOptions } from "./factory"

// Error types
export { PricingRuleError } from "./errors/PricingRuleError"

// Utility functions
export { createId as generateId } from "./ids"
export { createId } from "./ids"

export { formatBRL, formatCurrency } from "@/lib/utils"
