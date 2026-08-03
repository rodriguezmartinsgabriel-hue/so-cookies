import { PricingAction } from './PricingAction';

export class LogAction implements PricingAction {
  constructor(
    public id: string,
    public ruleId: string,
    public ruleName: string,
    public actionType: string,
    public value: any,
    public sourceRule: string,
    public timestamp: Date,
    public metadata?: Record<string, any>
  ) {}
}
