import type { PricingState, PricingSummary, PricingItem, Discount, Cashback, Tax } from '../types';

export class PricingSummaryCalculator {
  calculate(state: PricingState): PricingSummary {
    return {
      originalPrice: this.calculateOriginalPrice(state.items),
      subtotal: this.calculateSubtotal(state.items),
      discountTotal: this.calculateDiscountTotal(state),
      cashbackTotal: this.calculateCashbackTotal(state.cashbacks),
       shippingTotal: state.shipping?.cost || 0,
      taxTotal: this.calculateTaxTotal(state.taxes),
      total: this.calculateTotal(state),
      discountPercent: this.calculateDiscountPercent(state),
      rulesApplied: this.getAppliedRules(state),
      executionTime: 0
    };
  }

  private calculateOriginalPrice(items: PricingItem[]): number {
    return items.reduce((sum, item) => sum + item.basePrice * item.qty, 0);
  }

  private calculateSubtotal(items: PricingItem[]): number {
    return items.reduce((sum, item) => sum + item.priceAfterDiscount * item.qty, 0);
  }

  private calculateItemSavings(state: PricingState): number {
    return Math.max(0, this.calculateOriginalPrice(state.items) - this.calculateSubtotal(state.items));
  }

  private calculateOrderDiscountTotal(discounts: Discount[]): number {
    return discounts
      .filter((d) => d.appliedTo === 'subtotal')
      .reduce((sum, d) => sum + d.value, 0);
  }

  private calculateDiscountTotal(state: PricingState): number {
    return this.calculateItemSavings(state) + this.calculateOrderDiscountTotal(state.discounts);
  }

  private calculateCashbackTotal(cashbacks: Cashback[]): number {
    return cashbacks.reduce((sum, c) => sum + c.value, 0);
  }

  private calculateTaxTotal(taxes: Tax[]): number {
    return taxes.reduce((sum, t) => sum + t.value, 0);
  }

  private calculateTotal(state: PricingState): number {
    const subtotal = this.calculateSubtotal(state.items);
    const orderDiscountTotal = this.calculateOrderDiscountTotal(state.discounts);
    const shippingTotal = state.shipping?.cost || 0;
    const taxTotal = this.calculateTaxTotal(state.taxes);
    const cashbackTotal = this.calculateCashbackTotal(state.cashbacks);

    return Math.max(0, subtotal - orderDiscountTotal) + shippingTotal + taxTotal - cashbackTotal;
  }

  private calculateDiscountPercent(state: PricingState): number {
    const originalPrice = this.calculateOriginalPrice(state.items);
    const discountTotal = this.calculateDiscountTotal(state);

    return originalPrice > 0 ? (discountTotal / originalPrice) * 100 : 0;
  }

  private getAppliedRules(state: PricingState): string[] {
    return [...new Set([
      ...state.discounts.map(d => d.id),
      ...state.cashbacks.map(c => c.id),
      ...state.taxes.map(t => t.id),
      ...state.warnings.map(w => w.id)
    ])];
  }
}






