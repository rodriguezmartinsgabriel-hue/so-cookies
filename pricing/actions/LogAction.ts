import { PricingAction, PricingActionType } from './PricingAction';

export class LogAction implements PricingAction {
  constructor(
    public id: string,
    public sourceRule: string,
    public timestamp: Date,
    public type: PricingActionType,
    public target: string,
    public value: unknown,
    public ruleId: string,
    public ruleName: string,
    public actionType: string,
    public metadata?: Record<string, unknown>
  ) {}
}






