import { createId } from "../ids"
import type { PricingRule } from "./PricingRule"
import type { PricingContext, PricingState, PricingData, Logger } from "../types"
import type { PricingAction } from "../actions/PricingAction"
import { PricingPhase } from "../pipeline/PricingPhase"
import { LoyaltyRepository } from "../repositories/LoyaltyRepository"

export class LoyaltyRule implements PricingRule {
  id = "loyalty"
  name = "Programa de Pontos"
  phase = PricingPhase.CUSTOMER
  weight = 1
  priority = 1
  enabled = true

  constructor(
    private loyaltyRepository: LoyaltyRepository,
    private logger: Logger,
  ) {}

  canApplySync(context: PricingContext, _state: PricingState, data: PricingData): boolean {
    return Boolean(context.customerId) && Boolean(data.settings.activateLoyalty)
  }

  async canApply(context: PricingContext, _state: PricingState, data: PricingData): Promise<boolean> {
    return this.canApplySync(context, _state, data)
  }

  async apply(context: PricingContext, state: PricingState, data: PricingData): Promise<PricingAction[]> {
    const actions: PricingAction[] = []

    if (!context.customerId) return actions

    let currentBalance = 0
    try {
      currentBalance = await this.loyaltyRepository.getBalance(context.customerId)
    } catch (err) {
      this.logger.error?.(`[LoyaltyRule] failed to read balance: ${(err as Error).message}`)
    }

    const subtotal = state.items.reduce((s, it) => s + it.priceAfterDiscount * it.qty, 0)
    const shipping = state.shipping?.cost ?? 0
    const total = subtotal + shipping
    const settings = data.settings
    const pointsToEarn = LoyaltyRepository.computePoints(total, {
      activateLoyalty: settings.activateLoyalty,
      pointsPerReal: settings.pointsPerReal,
      minOrderTotalForPoints: settings.minOrderTotalForPoints,
      roundingMode: settings.roundingMode,
    })
    const projectedAfter = currentBalance + pointsToEarn

    actions.push({
      id: generateId(),
      type: "ADD_LOG",
      target: "loyalty",
      value: {
        customerId: context.customerId,
        currentBalance,
        pointsToEarn,
        projectedAfter,
        total,
      },
      sourceRule: this.id,
      timestamp: new Date(),
    })

    return actions
  }

  getRuleName(): string {
    return this.name
  }

  getPhase(): PricingPhase {
    return this.phase
  }
}

function generateId(): string {
  return createId()
}
