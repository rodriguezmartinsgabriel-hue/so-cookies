import type { PricingRule } from "../rules/PricingRule"
import { PricingPhase } from "../pipeline/PricingPhase"

export class RuleRegistry {
  private rules = new Map<string, PricingRule>()
  private repositories = new Map<string, unknown>()

  register(rule: PricingRule): void {
    this.rules.set(rule.id, rule)
  }

  registerRepository<T>(name: string, repository: T): void {
    this.repositories.set(name, repository)
  }

  getRepository<T>(name: string): T | undefined {
    return this.repositories.get(name) as T | undefined
  }

  getPhaseRules(phase: PricingPhase): PricingRule[] {
    return Array.from(this.rules.values())
      .filter((rule) => rule.phase === phase)
      .sort((a, b) => (a.weight || a.priority) - (b.weight || b.priority))
  }

  get(ruleId: string): PricingRule | undefined {
    return this.rules.get(ruleId)
  }

  list(): PricingRule[] {
    return Array.from(this.rules.values())
  }

  unregister(ruleId: string): void {
    this.rules.delete(ruleId)
  }

  clear(): void {
    this.rules.clear()
  }

  has(ruleId: string): boolean {
    return this.rules.has(ruleId)
  }
}
