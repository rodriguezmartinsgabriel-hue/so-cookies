import type { PricingRule } from "../rules/PricingRule"
import type { PricingContext, PricingState, PricingData, Logger } from "../types"
import type { RuleRegistry } from "../registry/RuleRegistry"

export class RuleValidator {
  constructor(
    private registry: RuleRegistry,
    private logger: Logger,
  ) {}

  async validateRule(
    rule: PricingRule,
    context: PricingContext,
    state: PricingState,
    data: PricingData,
  ): Promise<boolean> {
    try {
      return await rule.canApply(context, state, data)
    } catch (error) {
      this.logger.error(`Validation error for rule ${rule.id}:`, error)
      return false
    }
  }

  validateRuleSync(rule: PricingRule, context: PricingContext, state: PricingState, data: PricingData): boolean {
    try {
      return rule.canApplySync(context, state, data)
    } catch {
      return false
    }
  }
}
