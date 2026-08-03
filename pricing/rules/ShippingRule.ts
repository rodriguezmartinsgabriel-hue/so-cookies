import type { PricingRule } from './PricingRule';
import type { PricingContext, PricingState, PricingData } from '../types';
import type { PricingAction } from '../actions/PricingAction';
import { PricingPhase } from '../pipeline/RulePipeline';
import { EventBus } from '../events/EventBus';

export class ShippingRule implements PricingRule {
  id = 'shipping';
  name = 'Cálculo de Frete';
  phase = PricingPhase.SHIPPING;
  weight = 4;
  priority = 4;
  enabled = true;

  constructor(
    private shippingRepository: any,
    private eventBus: EventBus,
    private logger: any
  ) {}

  async canApply(context: PricingContext, state: PricingState, data: PricingData): Promise<boolean> {
    return context.channel === 'delivery';
  }

  canApplySync(context: PricingContext, state: PricingState, data: PricingData): boolean {
    return context.channel === 'delivery';
  }

  async apply(context: PricingContext, state: PricingState, data: PricingData): Promise<PricingAction[]> {
    const actions: any[] = [];

    // Calcular peso total
    const totalWeight = state.items.reduce((sum, item) => sum + item.qty, 0);

    // Buscar taxa de frete
    const shippingRate = await this.shippingRepository.getRateByWeight(totalWeight, context.channel);

    if (shippingRate) {
      state.shipping = shippingRate.cost;

      // Adicionar log
      actions.push({
        id: generateId(),
        type: 'ADD_LOG',
        target: 'shipping',
        value: {
          totalWeight,
          shippingRateName: shippingRate.name,
          cost: shippingRate.cost
        },
        sourceRule: this.id,
        timestamp: new Date()
      });

      // Adicionar ação de frete
      actions.push({
        id: generateId(),
        type: 'ADD_SHIPPING',
        target: 'shipping',
        value: shippingRate.cost,
        sourceRule: this.id,
        timestamp: new Date(),
        cost: shippingRate.cost,
        name: 'ShippingAction'
      });

      // Emitir evento
      await this.eventBus.emit('ShippingCalculated', {
        channel: context.channel,
        weight: totalWeight,
        cost: shippingRate.cost,
        rateName: shippingRate.name
      });
    } else {
      actions.push({
        id: generateId(),
        type: 'ADD_WARNING',
        target: 'shipping',
        value: {
          message: 'Taxa de frete não encontrada',
          totalWeight,
          channel: context.channel
        },
        sourceRule: this.id,
        timestamp: new Date(),
        cost: 0,
        name: 'WarningAction',
        type: 'WARNING',
        message: 'Taxa de frete não encontrada',
        appliedTo: 'subtotal',
        percentage: 0,
        value: 0,
        rulesApplied: [],
        appliedItems: [],
        expiration: null,
        locked: false,
        appliedProducts: ['all'],
        allowedTypes: ['delivery', 'pickup', 'digital'],
        validUntil: null,
        discountValue: null,
        discountPercent: null,
        maxUsage: null,
        usedCount: 0,
        productId: null,
        qty: 0,
        basePrice: 0,
        calculatedPrice: 0,
        priceAfterDiscount: 0,
        discounts: [],
        taxes: [],
        bonuses: [],
        warnings: [],
        logs: [],
        blocked: false,
        blockedReason: '',
        version: '1.0.0',
        description: ''
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
