import type { PricingContext, PricingState, PricingData } from '../types';
import type { PricingAction } from '../actions/PricingAction';
import { PricingPhase } from '../pipeline/RulePipeline';

export interface PricingRule {
  id: string;
  name: string;
  phase: PricingPhase;
  weight: number;
  priority: number;
  enabled: boolean;
  canApply(context: PricingContext, state: PricingState, data: PricingData): Promise<boolean> | boolean;
  canApplySync(context: PricingContext, state: PricingState, data: PricingData): boolean;
  apply(context: PricingContext, state: PricingState, data: PricingData): Promise<PricingAction[]>;
  getRuleName(): string;
  getPhase(): PricingPhase;
}

export class BasePriceRule implements PricingRule {
  id = 'base-price';
  name = 'Preço Base do Produto';
  phase = PricingPhase.BASE;
  weight = 1;
  priority = 1;
  enabled = true;

  constructor(
    private productRepository: any,
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
      const product = data.products[item.productId];

      if (!product) {
        this.logger.error(`Product not found: ${item.productId}`);
        actions.push({
          id: generateId(),
          type: 'ADD_WARNING',
          target: 'system',
          value: { message: `Produto não encontrado: ${item.productId}`, rule: this.id },
          sourceRule: this.id,
          timestamp: new Date()
        });
        continue;
      }

      // Atualizar preço calculado
      item.calculatedPrice = product.price;
      item.priceAfterDiscount = product.price;

      // Adicionar log
      actions.push({
        id: generateId(),
        type: 'ADD_LOG',
        target: 'product',
        value: {
          productId: item.productId,
          productName: product.name,
          newPrice: product.price,
          oldPrice: item.basePrice
        },
        sourceRule: this.id,
        timestamp: new Date()
      });
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






