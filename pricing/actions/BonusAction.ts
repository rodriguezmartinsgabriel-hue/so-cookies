import { PricingAction } from './PricingAction';

export class BonusAction implements PricingAction {
  constructor(
    public id: string,
    public name: string,
    public type: 'PRODUCT' | 'PERCENTAGE',
    public value: number,
    public appliedItems?: string[],
    public sourceRule: string,
    public timestamp: Date,
    public metadata?: Record<string, any>
  ) {}
}
