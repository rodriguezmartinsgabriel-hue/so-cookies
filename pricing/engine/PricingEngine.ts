import type { PricingContext, PricingState, PricingResult, PricingData, Logger, Metrics, LoyaltyPreview } from "../types"
import type { PricingAction } from "../actions/PricingAction"
import type { PrismaClient } from "@/generated/prisma/client"
import { PricingPhase } from "../pipeline/PricingPhase"
import { RuleExecutor } from "../executor/RuleExecutor"
import { ActionReducer } from "../reducers/ActionReducer"
import { PricingDataLoader } from "../loaders/PricingDataLoader"
import { PricingCache } from "../cache/PricingCache"
import { PricingAudit } from "../audit/PricingAudit"
import { PricingSummaryCalculator } from "../calculations/PricingSummaryCalculator"
import type { RuleRegistry } from "../registry/RuleRegistry"
import { ProductRepository } from "../repositories/ProductRepository"
import { CouponRepository } from "../repositories/CouponRepository"
import { CampaignRepository } from "../repositories/CampaignRepository"
import { ShippingRepository } from "../repositories/ShippingRepository"
import { PricingRepository } from "../repositories/PricingRepository"
import { LoyaltyRepository } from "../repositories/LoyaltyRepository"

const PHASE_TIMELINE: PricingPhase[] = [
  PricingPhase.BASE,
  PricingPhase.ITEM,
  PricingPhase.ORDER,
  PricingPhase.CUSTOMER,
  PricingPhase.PAYMENT,
  PricingPhase.SHIPPING,
  PricingPhase.POST_PROCESSING,
]

export class PricingEngine {
  private executor: RuleExecutor
  private reducer: ActionReducer
  private dataLoader: PricingDataLoader
  private audit: PricingAudit
  private summaryCalculator: PricingSummaryCalculator

  constructor(
    private prisma: PrismaClient,
    private registry: RuleRegistry,
    private logger: Logger,
    private metrics: Metrics,
  ) {
    this.executor = new RuleExecutor(registry, logger)
    this.reducer = new ActionReducer()
    this.dataLoader = new PricingDataLoader(
      registry.getRepository<ProductRepository>("product") ?? new ProductRepository(prisma),
      registry.getRepository<CouponRepository>("coupon") ?? new CouponRepository(prisma),
      registry.getRepository<CampaignRepository>("campaign") ?? new CampaignRepository(prisma),
      registry.getRepository<ShippingRepository>("shipping") ?? new ShippingRepository(prisma),
      registry.getRepository<PricingRepository>("pricing") ?? new PricingRepository(prisma),
      registry.getRepository<LoyaltyRepository>("loyalty") ?? new LoyaltyRepository(prisma),
      new PricingCache(),
    )
    this.audit = new PricingAudit(registry)
    this.summaryCalculator = new PricingSummaryCalculator()
  }

  async calculatePrice(context: PricingContext): Promise<PricingResult> {
    const startTime = Date.now()

    // 1. Carregar dados (apenas orquestração)
    const dataStart = Date.now()
    const data = await this.dataLoader.loadData(context)
    this.metrics.record("pricing", "data_load_time", Date.now() - dataStart)

    // 2. Inicializar estado transitório
    const state = this.initializeState(context, data)

    // 3. Executar regras em fases
    const rulesStart = Date.now()
    const actions = await this.executePhases(context, state, data)
    this.metrics.record("pricing", "rules_execution_time", Date.now() - rulesStart)

    // 4. Aplicar ações (apenas via reducer)
    const actionsStart = Date.now()
    const newState = this.reducer.reduce(state, actions)
    this.metrics.record("pricing", "actions_execution_time", Date.now() - actionsStart)

    // 5. Calcular totais e resumo
    const totalsStart = Date.now()
    const summary = this.summaryCalculator.calculate(newState)
    this.metrics.record("pricing", "totals_calculation_time", Date.now() - totalsStart)

    // 5.5 Expor tiers disponíveis no estado para a UI cliente poder mostrar
    //     progressão ("Faltam N para R$ X,XX/un"). Read-only, não muda regras.
    let stateWithTiers = this.attachAvailableTiers(newState, data)

    // 5.6 Expor preview de pontos para a UI cliente ("Você ganhará X pontos").
    //     Read-only, calculado a partir das settings + saldo real do cliente.
    stateWithTiers = this.attachLoyaltyPreview(stateWithTiers, data, summary.total)

    // 6. Criar resultado
    const result: PricingResult = {
      state: stateWithTiers,
      total: summary.total,
      summary,
      auditTrail: await this.audit.createTrail(context, newState, actions, Date.now() - startTime),
    }

    this.metrics.record("pricing", "total_execution_time", Date.now() - startTime)

    return result
  }

  private initializeState(context: PricingContext, data: PricingData): PricingState {
    return {
      items: context.items.map((item) => ({
        productId: item.productId,
        name: item.name || data.products[item.productId]?.name || "Produto",
        qty: item.qty,
        basePrice: item.basePrice,
        calculatedPrice: item.basePrice,
        priceAfterDiscount: item.basePrice,
      })),
      discounts: [],
      cashbacks: [],
      taxes: [],
      bonuses: [],
      warnings: [],
      logs: [],
      blocked: false,
      version: "1.0.0",
    }
  }

  private attachAvailableTiers(state: PricingState, data: PricingData): PricingState {
    const availableTiers: Record<string, Array<{ id: string; productId: string; name: string; minQty: number; maxQty: number | null; price: number }>> = {}
    for (const [productId, tiers] of Object.entries(data.priceTiers ?? {})) {
      availableTiers[productId] = tiers
        .filter((t) => t.enabled)
        .map((t) => ({
          id: t.id,
          productId: t.productId,
          name: t.name,
          minQty: t.minQty,
          maxQty: t.maxQty ?? null,
          price: t.price.toNumber(),
        }))
    }

    // Tiers compartilhados dos cookies assados: pega os tiers do primeiro
    // produto de cookie assado que aparece no carrinho (todos têm o mesmo
    // conjunto, garantido por seed-price-tiers.ts). Só populado quando há
    // pelo menos um item de cookie assado no estado.
    let cookieTiers: Array<{ id: string; productId: string; name: string; minQty: number; maxQty: number | null; price: number }> | undefined
    for (const item of state.items) {
      const product = data.products[item.productId]
      if (!product) continue
      const sku = product.sku ?? ""
      const isCookie = (sku.startsWith("CK-") && !sku.endsWith("-FZ")) || product.category === "Cookie" || product.category === "Assados"
      if (!isCookie) continue
      const list = data.priceTiers[item.productId]
      if (list && list.length > 0) {
        cookieTiers = list
          .filter((t) => t.enabled)
          .map((t) => ({
            id: t.id,
            productId: t.productId,
            name: t.name,
            minQty: t.minQty,
            maxQty: t.maxQty ?? null,
            price: t.price.toNumber(),
          }))
        break
      }
    }

    return cookieTiers ? { ...state, availableTiers, cookieTiers } : { ...state, availableTiers }
  }

  private attachLoyaltyPreview(state: PricingState, data: PricingData, total: number): PricingState {
    const settings = data.settings
    const active = settings.activateLoyalty && !data.loyaltyDegraded
    const currentBalance = data.loyaltyBalance ?? 0
    const pointsToEarn = active
      ? LoyaltyRepository.computePoints(total, {
          activateLoyalty: true,
          pointsPerReal: settings.pointsPerReal,
          minOrderTotalForPoints: settings.minOrderTotalForPoints,
          roundingMode: settings.roundingMode,
        })
      : 0
    const preview: LoyaltyPreview = {
      active,
      currentBalance,
      pointsToEarn,
      projectedAfter: currentBalance + pointsToEarn,
      ruleName: "Programa de Pontos",
      degraded: data.loyaltyDegraded === true,
    }
    return { ...state, loyaltyPreview: preview }
  }

  private async executePhases(
    context: PricingContext,
    state: PricingState,
    data: PricingData,
  ): Promise<PricingAction[]> {
    const allActions: PricingAction[] = []

    for (const phase of PHASE_TIMELINE) {
      const phaseActions = await this.executor.executeParallelInPhase(phase, context, state, data)

      allActions.push(...phaseActions)

      // Atualizar estado intermedeiramente (opcional)
      state = this.reducer.reduce(state, phaseActions)
    }

    return allActions
  }

  getExecutor(): RuleExecutor {
    return this.executor
  }
}
