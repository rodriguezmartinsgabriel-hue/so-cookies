import type { PricingState } from '../types';
import type { PricingSummary } from '../types';

export class PricingSummaryCalculator {
  calculate(state: PricingState): PricingSummary {
    return {
      originalPrice: this.calculateOriginalPrice(state.items),
      subtotal: this.calculateSubtotal(state.items),
      discountTotal: this.calculateDiscountTotal(state.discounts),
      cashbackTotal: this.calculateCashbackTotal(state.cashbacks),
       shippingTotal: state.shipping?.cost || 0,
      taxTotal: this.calculateTaxTotal(state.taxes),
      total: this.calculateTotal(state),
      discountPercent: this.calculateDiscountPercent(state),
      rulesApplied: this.getAppliedRules(state),
      executionTime: 0
    };
  }

  private calculateOriginalPrice(items: any[]): number {
    return items.reduce((sum, item) => sum + item.basePrice * item.qty, 0);
  }

  private calculateSubtotal(items: any[]): number {
    return items.reduce((sum, item) => sum + item.priceAfterDiscount * item.qty, 0);
  }

  private calculateDiscountTotal(discounts: any[]): number {
    return discounts.reduce((sum, d) => sum + d.value, 0);
  }

  private calculateCashbackTotal(cashbacks: any[]): number {
    return cashbacks.reduce((sum, c) => sum + c.value, 0);
  }

  private calculateTaxTotal(taxes: any[]): number {
    return taxes.reduce((sum, t) => sum + t.value, 0);
  }

  private calculateTotal(state: any): number {
    const subtotal = this.calculateSubtotal(state.items);
    const shippingTotal = state.shipping?.cost || 0;
    const taxTotal = this.calculateTaxTotal(state.taxes);
    const cashbackTotal = this.calculateCashbackTotal(state.cashbacks);

    return subtotal + shippingTotal + taxTotal - cashbackTotal;
  }

  private calculateDiscountPercent(state: any): number {
    const originalPrice = this.calculateOriginalPrice(state.items);
    const discountTotal = this.calculateDiscountTotal(state.discounts);

    return originalPrice > 0 ? (discountTotal / originalPrice) * 100 : 0;
  }

  private getAppliedRules(state: any): string[] {
    return [...new Set([
      ...state.discounts.map((d: any) => d.id),
      ...state.cashbacks.map((c: any) => c.id),
      ...state.taxes.map((t: any) => t.id),
      ...state.warnings.map((w: any) => w.id)
    ])];
  }
}






