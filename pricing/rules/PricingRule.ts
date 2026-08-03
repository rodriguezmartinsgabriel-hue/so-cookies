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
          timestamp: new Date(),
          cost: 0,
          name: 'warning',
          message: `Produto não encontrado: ${item.productId}`,
          appliedTo: 'subtotal',
          percentage: 0,
          value: 0,
          rulesApplied: [],
          appliedItems: [],
          expiration: null,
          locked: false,
          type: 'INFO',
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
          description: '',
          appliedProducts: ['all'],
          allowedTypes: ['delivery', 'pickup', 'digital'],
          validUntil: null,
          discountValue: null,
          discountPercent: null,
          maxUsage: null,
          usedCount: 0,
          minOrderValue: null
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
        timestamp: new Date(),
        cost: 0,
        name: 'LogAction',
        ruleId: this.id,
        ruleName: this.name,
        actionType: 'PRICE_UPDATED',
        appliedTo: 'subtotal',
        percentage: 0,
        value: 0,
        rulesApplied: [],
        appliedItems: [],
        expiration: null,
        locked: false,
        type: 'INFO',
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
        description: '',
        appliedProducts: ['all'],
        allowedTypes: ['delivery', 'pickup', 'digital'],
        validUntil: null,
        discountValue: null,
        discountPercent: null,
        maxUsage: null,
        usedCount: 0,
        minOrderValue: null
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
