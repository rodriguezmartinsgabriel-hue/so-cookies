import { createId } from '../ids';
import type { PricingRule } from './PricingRule';
import type { PricingContext, PricingState, PricingData, Logger } from '../types';
import type { PricingAction } from '../actions/PricingAction';
import type { ShippingRepository } from '../repositories/ShippingRepository';
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
    private shippingRepository: unknown,
    private eventBus: EventBus,
    private logger: Logger
  ) {}

  async canApply(context: PricingContext, _state: PricingState, _data: PricingData): Promise<boolean> {
    return context.channel === 'delivery';
  }

  canApplySync(context: PricingContext, _state: PricingState, _data: PricingData): boolean {
    return context.channel === 'delivery';
  }

  async apply(context: PricingContext, state: PricingState, _data: PricingData): Promise<PricingAction[]> {
    const actions: PricingAction[] = [];

    // Frete grátis ativado por cupom (fase PAYMENT já reduziu o estado)
    if (state.freeShipping) {
      actions.push({
        id: generateId(),
        type: 'ADD_LOG',
        target: 'shipping',
        value: {
          message: 'Frete grátis ativado',
          cost: 0
        },
        sourceRule: this.id,
        timestamp: new Date()
      });

      actions.push({
        id: generateId(),
        type: 'ADD_SHIPPING',
        target: 'shipping',
        value: 0,
        sourceRule: this.id,
        timestamp: new Date()
      });

      return actions;
    }

    // Calcular peso total
    const totalWeight = state.items.reduce((sum, item) => sum + item.qty, 0);

    // Buscar taxa de frete
    const shippingRate = await (this.shippingRepository as ShippingRepository).getRateByWeight(totalWeight, context.channel);

    if (shippingRate) {
      // Adicionar log
      actions.push({
        id: generateId(),
        type: 'ADD_LOG',
        target: 'shipping',
        value: {
          totalWeight,
          shippingRateName: shippingRate.name,
          cost: shippingRate.basePrice
        },
        sourceRule: this.id,
        timestamp: new Date()
      });

      // Adicionar ação de frete
      actions.push({
        id: generateId(),
        type: 'ADD_SHIPPING',
        target: 'shipping',
        value: shippingRate.basePrice,
        sourceRule: this.id,
        timestamp: new Date()
      });

      // Emitir evento
      await this.eventBus.emit('ShippingCalculated', {
        channel: context.channel,
        weight: totalWeight,
        cost: shippingRate.basePrice,
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
  return createId();
}






