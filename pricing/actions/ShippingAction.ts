import { PricingAction, PricingActionType } from './PricingAction';

export class ShippingAction implements PricingAction {
  constructor(
    public id: string,
    public sourceRule: string,
    public timestamp: Date,
    public type: PricingActionType,
    public target: string,
    public value: number,
    public cost: number,
    public metadata?: Record<string, unknown>
  ) {}
}






