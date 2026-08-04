import type { PricingRule } from '../rules/PricingRule';
import { PricingPhase } from './PricingPhase';

export { PricingPhase }

export class RulePipeline {
  private phases = new Map<PricingPhase, PricingRule[]>();

  constructor() {
    this.initializeDefaultPhases();
  }

  private initializeDefaultPhases(): void {
    this.registerPhase(PricingPhase.BASE, []);
    this.registerPhase(PricingPhase.ITEM, []);
    this.registerPhase(PricingPhase.ORDER, []);
    this.registerPhase(PricingPhase.CUSTOMER, []);
    this.registerPhase(PricingPhase.PAYMENT, []);
    this.registerPhase(PricingPhase.SHIPPING, []);
    this.registerPhase(PricingPhase.POST_PROCESSING, []);
  }

  registerPhase(phase: PricingPhase, rules: PricingRule[]): void {
    this.phases.set(phase, rules);
  }

  getRules(): PricingRule[] {
    const rules: PricingRule[] = [];

    for (const phaseRules of this.phases.values()) {
      const sortedRules = [...phaseRules].sort((a, b) => {
        const aWeight = a.weight || a.priority || 0;
        const bWeight = b.weight || b.priority || 0;
        return aWeight - bWeight;
      });
      rules.push(...sortedRules);
    }

    return rules;
  }

  getPhaseRules(phase: PricingPhase): PricingRule[] {
    const phaseRules = this.phases.get(phase) || [];
    return [...phaseRules].sort((a, b) => {
      const aWeight = a.weight || a.priority || 0;
      const bWeight = b.weight || b.priority || 0;
      return aWeight - bWeight;
    });
  }

  getPhaseTimeline(): Array<{ phase: PricingPhase; rules: PricingRule[] }> {
    const timeline: Array<{ phase: PricingPhase; rules: PricingRule[] }> = [];

    for (const [phase, phaseRules] of this.phases.entries()) {
      timeline.push({
        phase,
        rules: [...phaseRules].sort((a, b) => {
          const aWeight = a.weight || a.priority || 0;
          const bWeight = b.weight || b.priority || 0;
          return aWeight - bWeight;
        })
      });
    }

    return timeline;
  }
}






