import { PricingAction, PricingActionType } from './PricingAction';

export class DiscountAction implements PricingAction {
  constructor(
    public id: string,
    public sourceRule: string,
    public timestamp: Date,
    public type: PricingActionType,
    public target: string,
    public value: number,
    public percentage: number,
    public appliedTo: 'items' | 'subtotal',
    public metadata?: Record<string, any>
  ) {}
}






