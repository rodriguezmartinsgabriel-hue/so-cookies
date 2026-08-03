import { PricingAction } from './PricingAction';

export class ShippingAction implements PricingAction {
  constructor(
    public id: string,
    public cost: number,
    public sourceRule: string,
    public timestamp: Date,
    public metadata?: Record<string, any>
  ) {}
}
