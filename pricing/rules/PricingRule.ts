import type { PricingContext, PricingState, PricingData, Logger } from '../types';
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
    private productRepository: unknown,
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

      // Registrar mudança de preço via ação (regras são puras; estado muda só no reducer)
      actions.push({
        id: generateId(),
        type: 'CHANGE_ITEM_PRICE',
        target: 'product',
        value: product.price,
        productId: item.productId,
        newPrice: product.price,
        sourceRule: this.id,
        timestamp: new Date()
      });

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






