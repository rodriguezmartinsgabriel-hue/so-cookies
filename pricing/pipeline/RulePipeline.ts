import type { PricingRule } from '../rules/PricingRule';

export enum PricingPhase {
  BASE = 'BASE',
  ITEM = 'ITEM',
  ORDER = 'ORDER',
  CUSTOMER = 'CUSTOMER',
  PAYMENT = 'PAYMENT',
  SHIPPING = 'SHIPPING',
  POST_PROCESSING = 'POST_PROCESSING'
}

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

    for (const [phase, phaseRules] of this.phases.entries()) {
      const sortedRules = [...phaseRules].sort((a, b) => {
        const aWeight = (a as any).weight || (a as any).priority || 0;
        const bWeight = (b as any).weight || (b as any).priority || 0;
        return aWeight - bWeight;
      });
      rules.push(...sortedRules);
    }

    return rules;
  }

  getPhaseRules(phase: PricingPhase): PricingRule[] {
    const phaseRules = this.phases.get(phase) || [];
    return [...phaseRules].sort((a, b) => {
      const aWeight = (a as any).weight || (a as any).priority || 0;
      const bWeight = (b as any).weight || (b as any).priority || 0;
      return aWeight - bWeight;
    });
  }

  getPhaseTimeline(): Array<{ phase: PricingPhase; rules: PricingRule[] }> {
    const timeline: Array<{ phase: PricingPhase; rules: PricingRule[] }> = [];

    for (const [phase, phaseRules] of this.phases.entries()) {
      timeline.push({
        phase,
        rules: [...phaseRules].sort((a, b) => {
          const aWeight = (a as any).weight || (a as any).priority || 0;
          const bWeight = (b as any).weight || (b as any).priority || 0;
          return aWeight - bWeight;
        })
      });
    }

    return timeline;
  }
}
