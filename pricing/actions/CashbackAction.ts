import { PricingAction } from './PricingAction';

export class CashbackAction implements PricingAction {
  constructor(
    public id: string,
    public value: number,
    public percentage: number,
    public expiration?: Date,
    public locked: boolean,
    public sourceRule: string,
    public timestamp: Date,
    public metadata?: Record<string, any>
  ) {}
}
