import { createId } from "../ids"
import type { PricingRule } from "./PricingRule"
import type { PricingContext, PricingState, PricingData, Logger } from "../types"
import type { PricingAction } from "../actions/PricingAction"
import type { CampaignRepository } from "../repositories/CampaignRepository"
import { PricingPhase } from "../pipeline/PricingPhase"
import { EventBus } from "../events/EventBus"

interface CampaignConditions {
  discountPercent?: number
  discountFixed?: number
  minQty?: number
  minOrderValue?: number
  products?: string[]
  categories?: string[]
  customerTypes?: string[]
}

export class CampaignRule implements PricingRule {
  id = "campaign"
  name = "Campanha Promocional"
  phase = PricingPhase.ORDER
  weight = 3
  priority = 3
  enabled = true

  constructor(
    private campaignRepository: CampaignRepository,
    private eventBus: EventBus,
    private logger: Logger,
  ) {}

  canApplySync(_context: PricingContext, _state: PricingState, data: PricingData): boolean {
    return data.campaigns.length > 0 && data.settings.activateCampaign
  }

  async canApply(_context: PricingContext, _state: PricingState, data: PricingData): Promise<boolean> {
    return this.canApplySync(_context, _state, data)
  }

  async apply(context: PricingContext, state: PricingState, data: PricingData): Promise<PricingAction[]> {
    const actions: PricingAction[] = []
    const subtotal = state.items.reduce((sum, item) => sum + item.priceAfterDiscount * item.qty, 0)
    const totalQty = state.items.reduce((sum, item) => sum + item.qty, 0)

    const matching = data.campaigns
      .filter((campaign) =>
        this.matchesConditions(campaign.conditions as CampaignConditions, context, state, data, subtotal, totalQty),
      )
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

    const campaign = matching[0]

    if (!campaign) {
      return actions
    }

    const conditions = campaign.conditions as CampaignConditions
    const logBase = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      type: campaign.type,
    }

    if (typeof conditions.discountPercent === "number" && conditions.discountPercent > 0) {
      actions.push({
        id: generateId(),
        type: "ADD_DISCOUNT_PERCENTAGE",
        target: "subtotal",
        value: conditions.discountPercent,
        percentage: conditions.discountPercent,
        appliedTo: "subtotal",
        name: campaign.name,
        sourceRule: this.id,
        timestamp: new Date(),
        metadata: logBase,
      })
    } else if (typeof conditions.discountFixed === "number" && conditions.discountFixed > 0) {
      actions.push({
        id: generateId(),
        type: "ADD_DISCOUNT_FIXED",
        target: "subtotal",
        value: conditions.discountFixed,
        appliedTo: "subtotal",
        name: campaign.name,
        sourceRule: this.id,
        timestamp: new Date(),
        metadata: logBase,
      })
    }

    actions.push({
      id: generateId(),
      type: "ADD_LOG",
      target: "campaign",
      value: {
        campaignId: campaign.id,
        campaignName: campaign.name,
        type: campaign.type,
        discountPercent: conditions.discountPercent,
        discountFixed: conditions.discountFixed,
      },
      sourceRule: this.id,
      timestamp: new Date(),
      metadata: logBase,
    })

    await this.eventBus.emit("CampaignApplied", {
      campaignId: campaign.id,
      campaignName: campaign.name,
      type: campaign.type,
      conditions,
    })

    return actions
  }

  getRuleName(): string {
    return this.name
  }

  getPhase(): PricingPhase {
    return this.phase
  }

  private matchesConditions(
    conditions: CampaignConditions | null | undefined,
    context: PricingContext,
    state: PricingState,
    data: PricingData,
    subtotal: number,
    totalQty: number,
  ): boolean {
    if (!conditions) {
      return false
    }

    if (conditions.minQty && totalQty < conditions.minQty) {
      return false
    }

    if (conditions.minOrderValue && subtotal < conditions.minOrderValue) {
      return false
    }

    if (conditions.products && conditions.products.length > 0) {
      const hasProduct = state.items.some((item) => conditions.products!.includes(item.productId))
      if (!hasProduct) {
        return false
      }
    }

    if (conditions.categories && conditions.categories.length > 0) {
      const hasCategory = state.items.some((item) => {
        const product = data.products[item.productId]
        return Boolean(product?.category && conditions.categories!.includes(product.category))
      })
      if (!hasCategory) {
        return false
      }
    }

    if (conditions.customerTypes && conditions.customerTypes.length > 0) {
      if (!conditions.customerTypes.includes(context.customerType)) {
        return false
      }
    }

    return true
  }
}

function generateId(): string {
  return createId()
}
