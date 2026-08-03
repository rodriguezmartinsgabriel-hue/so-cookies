import { PricingAction, PricingActionType } from './PricingAction';

export class WarningAction implements PricingAction {
  constructor(
    public id: string,
    public sourceRule: string,
    public timestamp: Date,
    public type: PricingActionType,
    public target: string,
    public value: any,
    public message: string,
    public metadata?: Record<string, any>
  ) {}
}






