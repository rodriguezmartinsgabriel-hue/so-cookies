import type { PricingContext, PricingState, AuditTrail, TimelineEvent, AuditEvent } from '../types';
import type { PricingAction } from '../actions/PricingAction';
import type { EventBus } from '../events/EventBus';
import type { RuleRegistry } from '../registry/RuleRegistry';
import type { PrismaClient } from '@/generated/prisma/client';
import { PricingPhase } from '../pipeline/PricingPhase';

export class PricingAudit {
  constructor(
    private prisma: PrismaClient,
    private eventBus: EventBus,
    private registry: RuleRegistry
  ) {}

  async createTrail(
    context: PricingContext,
    state: PricingState,
    actions: PricingAction[],
    executionTime: number
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

    const timeline = this.createTimeline(state, events);

    // Salvar no banco
    await this.saveTrail(context, state, actions, executionTime);

    return {
      events,
      timeline
    };
  }

  private createTimeline(state: PricingState, events: AuditEvent[]): TimelineEvent[] {
    const timeline: TimelineEvent[] = [];

    const phases = [
      PricingPhase.BASE,
      PricingPhase.ITEM,
      PricingPhase.ORDER,
      PricingPhase.CUSTOMER,
      PricingPhase.PAYMENT,
      PricingPhase.SHIPPING,
      PricingPhase.POST_PROCESSING
    ];

    for (const phase of phases) {
      const phaseEvents = events.filter(e => {
        // Verificar se o evento pertence a esta fase
        const rule = this.registry.get(e.ruleId);
        return rule?.getPhase() === phase;
      });

      const discount = state.discounts.reduce((sum, d) => {
        const rule = this.registry.get(d.id);
        return rule && rule.getPhase() === phase ? sum + d.value : sum;
      }, 0);

      const subtotal = state.items.reduce((sum, item) => {
        const rule = this.registry.get(item.productId);
        return rule && rule.getPhase() === phase ? sum + item.priceAfterDiscount * item.qty : sum;
      }, 0);

      timeline.push({
        timestamp: new Date(),
        phase,
        phaseIndex: phases.indexOf(phase),
        events: phaseEvents.map(e => e.actionType),
        totalDiscount: discount,
        totalSubtotal: subtotal
      });
    }

    return timeline;
  }

  private async saveTrail(_context: PricingContext, _state: PricingState, _actions: PricingAction[], _executionTime: number): Promise<void> {
    // Implementar salvamento em banco
    // Exemplo: await prisma.pricingAudit.create({...})
  }

  private getRuleName(ruleId: string): string {
    const rule = this.registry.get(ruleId);
    return rule?.name || ruleId;
  }
}






