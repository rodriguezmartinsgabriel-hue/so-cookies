export class PricingRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingRuleError';
  }
}
