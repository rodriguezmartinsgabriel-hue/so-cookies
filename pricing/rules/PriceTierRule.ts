import { createId } from "../ids"
import type { PricingRule } from "./PricingRule"
import type { PricingContext, PricingState, PricingData, Logger } from "../types"
import type { PricingAction } from "../actions/PricingAction"
import { PricingPhase } from "../pipeline/PricingPhase"

export class PriceTierRule implements PricingRule {
  id = "price-tier"
  name = "Faixa de Quantidade"
  phase = PricingPhase.ITEM
  weight = 2
  priority = 2
  enabled = true

  constructor(
    private pricingRepository: unknown,
    private logger: Logger,
  ) {}

  async canApply(_context: PricingContext, _state: PricingState, data: PricingData): Promise<boolean> {
    return data.settings.activatePriceTier
  }

  canApplySync(_context: PricingContext, _state: PricingState, data: PricingData): boolean {
    return data.settings.activatePriceTier
  }

  async apply(context: PricingContext, state: PricingState, data: PricingData): Promise<PricingAction[]> {
    const actions: PricingAction[] = []

    // Particionar itens em "cookies assados" (que agregam qty entre sabores para
    // o desconto por volume) e demais produtos (tier aplicado por SKU).
    // Critério idêntico ao seed-price-tiers.ts: sku começa com "CK-" e não
    // termina com "-FZ", OU categoria em {"Cookie","Assados"}.
    const cookieItems: typeof state.items = []
    const otherItems: typeof state.items = []
    for (const item of state.items) {
      if (isCookieAssado(item.productId, data)) cookieItems.push(item)
      else otherItems.push(item)
    }

    // Cookies assados: agregam qty entre sabores. Todos compartilham o mesmo
    // conjunto de tiers (garantido por seed-price-tiers.ts), então lemos os
    // tiers do primeiro cookie participante e escolhemos a faixa pela soma.
    if (cookieItems.length > 0) {
      const totalCookieQty = cookieItems.reduce((s, it) => s + it.qty, 0)
      const sharedTiers = data.priceTiers[cookieItems[0].productId] || []
      const applicableTier = sharedTiers.find(
        (tier) => tier.minQty <= totalCookieQty && (!tier.maxQty || tier.maxQty >= totalCookieQty),
      )

      if (applicableTier) {
        for (const item of cookieItems) {
          pushTierActions(actions, this.id, item, applicableTier, totalCookieQty)
        }
      }
    }

    // Demais produtos (congelados, B2B, etc.): tier aplicado por SKU individual.
    for (const item of otherItems) {
      const priceTiers = data.priceTiers[item.productId] || []
      const applicableTier = priceTiers.find(
        (tier) => tier.minQty <= item.qty && (!tier.maxQty || tier.maxQty >= item.qty),
      )
      if (applicableTier) {
        pushTierActions(actions, this.id, item, applicableTier, item.qty)
      }
    }

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

/**
 * Detecta se um produto é um "cookie assado" elegível para o desconto por
 * volume agregado entre sabores. Mesmo critério do seed-price-tiers.ts:
 * sku começa com "CK-" e não termina com "-FZ", OU categoria em
 * {"Cookie","Assados"}.
 */
function isCookieAssado(productId: string, data: PricingData): boolean {
  const product = data.products[productId]
  if (!product) return false
  const sku = product.sku ?? ""
  if (sku.startsWith("CK-") && !sku.endsWith("-FZ")) return true
  if (product.category === "Cookie" || product.category === "Assados") return true
  return false
}

type TierLike = { name: string; price: { toNumber(): number } }

/**
 * Empilha as 3 ações de tier (CHANGE_ITEM_PRICE, ADD_LOG, ADD_DISCOUNT_FIXED)
 * para um item, considerando a qty usada para selecionar a faixa (pode ser a
 * qty agregada dos cookies assados ou a qty individual do próprio item).
 */
function pushTierActions(
  actions: PricingAction[],
  ruleId: string,
  item: { productId: string; name: string; qty: number; calculatedPrice: number },
  tier: TierLike,
  referenceQty: number,
): void {
  const oldPrice = item.calculatedPrice
  const newPrice = tier.price.toNumber()
  const discountValue = oldPrice - newPrice
  const discountPercent = (discountValue / oldPrice) * 100

  actions.push({
    id: generateId(),
    type: "CHANGE_ITEM_PRICE",
    target: "tier",
    value: newPrice,
    productId: item.productId,
    newPrice,
    sourceRule: ruleId,
    timestamp: new Date(),
  })

  actions.push({
    id: generateId(),
    type: "ADD_LOG",
    target: "tier",
    value: {
      productId: item.productId,
      productName: item.name,
      qty: item.qty,
      referenceQty,
      oldPrice,
      newPrice,
      discountValue,
      discountPercent,
      tierName: tier.name,
    },
    sourceRule: ruleId,
    timestamp: new Date(),
  })

  actions.push({
    id: generateId(),
    type: "ADD_DISCOUNT_FIXED",
    target: "items",
    value: discountValue,
    appliedTo: "items",
    percentage: discountPercent,
    name: `Faixa ${tier.name}`,
    sourceRule: ruleId,
    timestamp: new Date(),
  })
}
