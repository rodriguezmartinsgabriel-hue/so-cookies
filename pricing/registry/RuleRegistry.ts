import type { PricingRule } from '../rules/PricingRule';

export class RuleRegistry {
  private rules = new Map<string, PricingRule>();

  register(rule: PricingRule): void {
    this.rules.set(rule.id, rule);
  }

  get(ruleId: string): PricingRule | undefined {
    return this.rules.get(ruleId);
  }

  list(): PricingRule[] {
    return Array.from(this.rules.values());
  }

  unregister(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  clear(): void {
    this.rules.clear();
  }

  has(ruleId: string): boolean {
    return this.rules.has(ruleId);
  }
}
