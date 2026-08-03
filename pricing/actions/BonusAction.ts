import { PricingAction, PricingActionType } from './PricingAction';

export class BonusAction implements PricingAction {
  constructor(
    public id: string,
    public sourceRule: string,
    public timestamp: Date,
    public type: PricingActionType,
    public target: string,
    public value: number,
    public name: string,
    public appliedItems?: string[],
    public metadata?: Record<string, any>
  ) {}
}






