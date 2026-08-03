import { PricingAction } from './PricingAction';

export class DiscountAction implements PricingAction {
  constructor(
    public id: string,
    public type: 'PERCENTAGE' | 'FIXED',
    public target: 'items' | 'subtotal',
    public value: number,
    public percentage: number,
    public appliedTo: 'items' | 'subtotal',
    public sourceRule: string,
    public timestamp: Date,
    public metadata?: Record<string, any>
  ) {}
}
