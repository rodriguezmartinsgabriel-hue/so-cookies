import type { PricingContext, PricingState, AuditTrail, TimelineEvent, AuditEvent } from '../types';
import type { PricingAction } from '../actions/PricingAction';
import type { RuleRegistry } from '../registry/RuleRegistry';
import { PricingPhase } from '../pipeline/PricingPhase';

const PHASES: PricingPhase[] = [
  PricingPhase.BASE,
  PricingPhase.ITEM,
  PricingPhase.ORDER,
  PricingPhase.CUSTOMER,
  PricingPhase.PAYMENT,
  PricingPhase.SHIPPING,
  PricingPhase.POST_PROCESSING,
];

export class PricingAudit {
  constructor(private registry: RuleRegistry) {}

  async createTrail(
    _context: PricingContext,
    state: PricingState,
    actions: PricingAction[],
    _executionTime: number
  ): Promise<AuditTrail> {
    const events = actions.map(action => ({
      timestamp: action.timestamp,
      ruleId: action.sourceRule,
      ruleName: this.getRuleName(action.sourceRule),
      actionType: action.type,
      target: action.target,
      value: action.value,
      details: action.metadata || {}
    }));

    const timeline = this.createTimeline(state, actions, events);

    return {
      events,
      timeline
    };
  }

  private createTimeline(state: PricingState, actions: PricingAction[], events: AuditEvent[]): TimelineEvent[] {
    const timeline: TimelineEvent[] = [];

    const actionById = new Map(actions.map(action => [action.id, action]));
    const discountByAction = new Map<string, number>();
    for (const discount of state.discounts) {
      const action = actionById.get(discount.id);
      if (action) {
        discountByAction.set(action.id, discount.value);
      }
    }

    const runningItems = new Map(state.items.map(item => [item.productId, { ...item }]));
    let subtotal = state.items.reduce((sum, item) => sum + item.basePrice * item.qty, 0);
    let accumulatedOrderDiscount = 0;

    for (const phase of PHASES) {
      const phaseActions = actions.filter(action => this.getRulePhase(action.sourceRule) === phase);
      const phaseEvents = events.filter(event => this.getRulePhase(event.ruleId) === phase);

      // Reduzir preços de itens aplicados nesta fase (ex.: faixas de quantidade)
      let phaseItemDiscount = 0;
      for (const action of phaseActions) {
        if (action.type === 'CHANGE_ITEM_PRICE' && action.productId && typeof action.newPrice === 'number') {
          const item = runningItems.get(action.productId);
          if (item && item.priceAfterDiscount > action.newPrice) {
            phaseItemDiscount += (item.priceAfterDiscount - action.newPrice) * item.qty;
            item.priceAfterDiscount = action.newPrice;
          }
        }
      }
      subtotal -= phaseItemDiscount;

      // Descontos de pedido (subtotal) produzidos nesta fase
      const phaseOrderDiscount = phaseActions.reduce((sum, action) => {
        if (action.appliedTo !== 'subtotal') return sum;
        return sum + (discountByAction.get(action.id) ?? 0);
      }, 0);
      accumulatedOrderDiscount += phaseOrderDiscount;

      timeline.push({
        timestamp: new Date(),
        phase,
        phaseIndex: PHASES.indexOf(phase),
        events: phaseEvents.map(event => event.actionType),
        totalDiscount: Math.max(0, phaseItemDiscount + phaseOrderDiscount),
        totalSubtotal: Math.max(0, subtotal - accumulatedOrderDiscount),
      });
    }

    return timeline;
  }

  private getRulePhase(ruleId: string): PricingPhase | undefined {
    return this.registry.get(ruleId)?.getPhase();
  }

  private getRuleName(ruleId: string): string {
    const rule = this.registry.get(ruleId);
    return rule?.name || ruleId;
  }
}
