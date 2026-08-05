import { createId } from '../ids';
import type { PricingRule } from './PricingRule';
import type { PricingContext, PricingState, PricingData, Logger } from '../types';
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
    private pricingRepository: unknown,
    private logger: Logger
  ) {}

  async canApply(_context: PricingContext, _state: PricingState, _data: PricingData): Promise<boolean> {
    return true;
  }

  canApplySync(_context: PricingContext, _state: PricingState, _data: PricingData): boolean {
    return true;
  }

  async apply(context: PricingContext, state: PricingState, data: PricingData): Promise<PricingAction[]> {
    const actions: PricingAction[] = [];

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

        // Registrar mudança de preço via ação (regras são puras; estado muda só no reducer)
        actions.push({
          id: generateId(),
          type: 'CHANGE_ITEM_PRICE',
          target: 'tier',
          value: newPrice,
          productId: item.productId,
          newPrice,
          sourceRule: this.id,
          timestamp: new Date()
        });

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
          sourceRule: this.id,
          timestamp: new Date()
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
  return createId();
}






