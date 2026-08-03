import { PricingAction, PricingActionType } from './PricingAction';

export class CashbackAction implements PricingAction {
  constructor(
    public id: string,
    public sourceRule: string,
    public timestamp: Date,
    public type: PricingActionType,
    public target: string,
    public value: number,
    public percentage: number,
    public locked: boolean,
    public expiration?: Date,
    public metadata?: Record<string, any>
  ) {}
}






