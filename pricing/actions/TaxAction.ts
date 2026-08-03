import { PricingAction } from './PricingAction';

export class TaxAction implements PricingAction {
  constructor(
    public id: string,
    public name: string,
    public type: 'ICMS' | 'ISS' | 'NOTA_FISCAL',
    public value: number,
    public percentage: number,
    public sourceRule: string,
    public timestamp: Date,
    public metadata?: Record<string, any>
  ) {}
}
