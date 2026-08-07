import type { PrismaClient } from "@/generated/prisma/client"
import type { Logger, Metrics } from "./types"
import { PricingEngine } from "./engine/PricingEngine"
import { RuleRegistry } from "./registry/RuleRegistry"
import { EventBus } from "./events/EventBus"
import { ProductRepository } from "./repositories/ProductRepository"
import { CouponRepository } from "./repositories/CouponRepository"
import { CampaignRepository } from "./repositories/CampaignRepository"
import { ShippingRepository } from "./repositories/ShippingRepository"
import { PricingRepository } from "./repositories/PricingRepository"
import { LoyaltyRepository } from "./repositories/LoyaltyRepository"
import { BasePriceRule } from "./rules/PricingRule"
import { PriceTierRule } from "./rules/PriceTierRule"
import { CouponRule } from "./rules/CouponRule"
import { CampaignRule } from "./rules/CampaignRule"
import { B2BRule } from "./rules/B2BRule"
import { ShippingRule } from "./rules/ShippingRule"
import { LoyaltyRule } from "./rules/LoyaltyRule"

export interface BuildPricingEngineOptions {
  logger?: Logger
  metrics?: Metrics
  // Permite sobrescrever os repositórios registrados (ex.: mocks em testes)
  register?: (registry: RuleRegistry) => void
}

const noopLogger: Logger = { log: () => {}, error: () => {} }
const noopMetrics: Metrics = { record: () => void 0 }

// Singleton por processo: o PricingEngine é stateless entre chamadas de
// calculatePrice, então reutilizá-lo evita reconstruir regras/repositórios a
// cada request E faz o PricingCache interno persistir entre requests
// (campaigns/shipping/coupons semi-estáticos não são re-consultados).
const engineByPrisma = new WeakMap<object, PricingEngine>()

export function getPricingEngine(prisma: PrismaClient): PricingEngine {
  let engine = engineByPrisma.get(prisma)
  if (!engine) {
    engine = buildPricingEngine(prisma)
    engineByPrisma.set(prisma, engine)
  }
  return engine
}

export function buildPricingEngine(prisma: PrismaClient, options: BuildPricingEngineOptions = {}): PricingEngine {
  const logger = options.logger ?? noopLogger
  const metrics = options.metrics ?? noopMetrics

  const registry = new RuleRegistry()
  registry.registerRepository("product", new ProductRepository(prisma))
  registry.registerRepository("coupon", new CouponRepository(prisma))
  registry.registerRepository("campaign", new CampaignRepository(prisma))
  registry.registerRepository("shipping", new ShippingRepository(prisma))
  registry.registerRepository("pricing", new PricingRepository(prisma))
  registry.registerRepository("loyalty", new LoyaltyRepository(prisma))

  if (options.register) {
    options.register(registry)
  }

  const productRepo = registry.getRepository<ProductRepository>("product")!
  const couponRepo = registry.getRepository<CouponRepository>("coupon")!
  const campaignRepo = registry.getRepository<CampaignRepository>("campaign")!
  const shippingRepo = registry.getRepository<ShippingRepository>("shipping")!
  const pricingRepo = registry.getRepository<PricingRepository>("pricing")!
  const loyaltyRepo = registry.getRepository<LoyaltyRepository>("loyalty")!

  const eventBus = new EventBus()

  registry.register(new BasePriceRule(productRepo, logger))
  registry.register(new PriceTierRule(pricingRepo, logger))
  registry.register(new CouponRule(couponRepo, eventBus, logger))
  registry.register(new CampaignRule(campaignRepo, eventBus, logger))
  registry.register(new B2BRule(logger))
  registry.register(new ShippingRule(shippingRepo, eventBus, logger))
  registry.register(new LoyaltyRule(loyaltyRepo, logger))

  return new PricingEngine(prisma, registry, logger, metrics)
}
