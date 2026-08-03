import type { PricingRule } from '../rules/PricingRule';
import type { PricingContext, PricingState, PricingData } from '../types';
import type { PricingRuleError } from '../errors/PricingRuleError';

export class RuleValidator {
  constructor(
    private registry: any,
    private logger: any
  ) {}

  async validateRule(rule: PricingRule, context: PricingContext, state: PricingState, data: PricingData): Promise<boolean> {
    try {
      const result = await rule.canApply(context, state, data);

      if (result instanceof Promise) {
        return await result;
      }

      return result;
    } catch (error) {
      this.logger.error(`Validation error for rule ${rule.id}:`, error);
      return false;
    }
  }

  validateRuleSync(rule: PricingRule, context: PricingContext, state: PricingState, data: PricingData): boolean {
    try {
      const result = rule.canApplySync(context, state, data);

      if (result instanceof Promise) {
        return false; // Não pode validar síncrono se for assíncrono
      }

      return result;
    } catch (error) {
      return false;
    }
  }
}
