import { PricingAction } from './PricingAction';

export class WarningAction implements PricingAction {
  constructor(
    public id: string,
    public type: 'INFO' | 'WARNING' | 'ERROR',
    public message: string,
    public sourceRule: string,
    public timestamp: Date,
    public metadata?: Record<string, any>
  ) {}
}
