import type { PricingRule } from './PricingRule';
import type { PricingContext, PricingState, PricingData } from '../types';
import type { PricingAction } from '../actions/PricingAction';
import { PricingPhase } from '../pipeline/RulePipeline';

export class PriceTierRule implements PricingRule {
  id = 'price-tier';
  name = 'Faixa de Quantidade';
  phase = PricingPhase.ITEM;
  weight = 2;
  priority = 2;
  enabled = true;

  constructor(
    private pricingRepository: any,
    private logger: any
  ) {}

  async canApply(context: PricingContext, state: PricingState, data: PricingData): Promise<boolean> {
    return true;
  }

  canApplySync(context: PricingContext, state: PricingState, data: PricingData): boolean {
    return true;
  }

  async apply(context: PricingContext, state: PricingState, data: PricingData): Promise<PricingAction[]> {
    const actions: any[] = [];

    for (const item of state.items) {
      const priceTiers = data.priceTiers[item.productId] || [];

      // Encontrar faixa aplicável
      const applicableTier = priceTiers.find(tier =>
        tier.minQty <= item.qty &&
        (!tier.maxQty || tier.maxQty >= item.qty)
      );

      if (applicableTier) {
        const oldPrice = item.calculatedPrice;
        const newPrice = applicableTier.price;
        const discountValue = oldPrice - newPrice;
        const discountPercent = (discountValue / oldPrice) * 100;

        item.calculatedPrice = newPrice;
        item.priceAfterDiscount = newPrice;

        // Adicionar log
        actions.push({
          id: generateId(),
          type: 'ADD_LOG',
          target: 'tier',
          value: {
            productId: item.productId,
            productName: item.name,
            qty: item.qty,
            oldPrice,
            newPrice,
            discountValue,
            discountPercent,
            tierName: applicableTier.name
          },
          sourceRule: this.id,
          timestamp: new Date()
        });

        // Adicionar desconto
        actions.push({
          id: generateId(),
          type: 'ADD_DISCOUNT_FIXED',
          target: 'items',
          value: discountValue,
          appliedTo: 'items',
          percentage: discountPercent,
          name: `Faixa ${applicableTier.name}`,
          cost: 0,
          name: 'DiscountAction',
          appliedProducts: ['all'],
          allowedTypes: ['delivery', 'pickup', 'digital'],
          expiration: null,
          description: `Faixa de quantidade aplicada: ${applicableTier.name}`,
          locked: false,
          minOrderValue: null,
          maxUsage: null,
          rulesApplied: [],
          usedCount: 0,
          appliedItems: [],
          validUntil: null,
          discountValue: null,
          discountPercent: null,
          productId: item.productId,
          qty: item.qty,
          basePrice: item.basePrice,
          calculatedPrice: item.calculatedPrice,
          priceAfterDiscount: item.priceAfterDiscount,
          discounts: [],
          taxes: [],
          bonuses: [],
          warnings: [],
          logs: [],
          blocked: false,
          blockedReason: '',
          version: '1.0.0',
          type: 'FIXED'
        });
      }
    }

    return actions;
  }

  getRuleName(): string {
    return this.name;
  }

  getPhase(): PricingPhase {
    return this.phase;
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
