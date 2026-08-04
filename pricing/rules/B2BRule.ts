import type { PricingRule } from './PricingRule';
import type { PricingContext, PricingState, PricingData, Logger } from '../types';
import type { PricingAction } from '../actions/PricingAction';
import { PricingPhase } from '../pipeline/RulePipeline';

export class B2BRule implements PricingRule {
  id = 'b2b';
  name = 'Desconto B2B';
  phase = PricingPhase.CUSTOMER;
  weight = 3;
  priority = 3;
  enabled = true;

  constructor(
    private logger: Logger
  ) {}

  canApplySync(context: PricingContext, _state: PricingState, data: PricingData): boolean {
    return context.customerType === 'B2B' && data.settings.activateB2B;
  }

  async canApply(context: PricingContext, _state: PricingState, data: PricingData): Promise<boolean> {
    return this.canApplySync(context, _state, data);
  }

  async apply(_context: PricingContext, _state: PricingState, data: PricingData): Promise<PricingAction[]> {
    const actions: PricingAction[] = [];
    const percentage = data.settings.b2bDiscountPercent;

    if (!percentage || percentage <= 0) {
      return actions;
    }

    actions.push({
      id: generateId(),
      type: 'ADD_DISCOUNT_PERCENTAGE',
      target: 'subtotal',
      value: percentage,
      percentage,
      appliedTo: 'subtotal',
      name: 'Desconto B2B',
      sourceRule: this.id,
      timestamp: new Date()
    });

    actions.push({
      id: generateId(),
      type: 'ADD_LOG',
      target: 'customer',
      value: {
        customerType: 'B2B',
        discountPercent: percentage
      },
      sourceRule: this.id,
      timestamp: new Date()
    });

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
