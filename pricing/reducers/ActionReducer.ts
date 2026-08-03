import type { PricingState } from '../types';
import type { PricingAction } from '../actions/PricingAction';
import type { Discount, Log } from '../types';

export class ActionReducer {
  private cloneState(state: PricingState): PricingState {
    return JSON.parse(JSON.stringify(state));
  }

  // Reduz uma lista de ações para um novo PricingState
  reduce(state: PricingState, actions: PricingAction[]): PricingState {
    let newState = this.cloneState(state);

    for (const action of actions) {
      switch (action.type) {
        case 'ADD_DISCOUNT_PERCENTAGE':
        case 'ADD_DISCOUNT_FIXED':
          newState = this.applyDiscount(newState, action);
          break;
        case 'CHANGE_ITEM_PRICE':
          newState = this.applyItemPriceChange(newState, action);
          break;
        case 'ADD_SHIPPING':
          newState.shipping = action.cost;
          break;
        case 'ADD_CASHBACK':
          newState.cashbacks.push(action.value);
          break;
        case 'ADD_TAX':
          newState.taxes.push(action.value);
          break;
        case 'ADD_BONUS':
          newState.bonuses.push(action.value);
          break;
        case 'ADD_WARNING':
          newState.warnings.push(action.value);
          break;
        case 'ADD_LOG':
          newState.logs.push(action.value);
          break;
        case 'BLOCK_CHECKOUT':
          newState.blocked = true;
          newState.blockedReason = action.message;
          break;
      }
    }

    return newState;
  }

  private applyDiscount(state: PricingState, action: any): PricingState {
    const newState = this.cloneState(state);

    if (action.appliedTo === 'subtotal') {
      newState.subtotal = Math.max(0, newState.subtotal - action.value);
    }

    const discount: Discount = {
      id: action.id,
      name: action.name || 'Desconto',
      type: action.type,
      value: action.value,
      percentage: action.percentage,
      appliedTo: action.appliedTo
    };

    newState.discounts.push(discount);

    return newState;
  }

  private applyItemPriceChange(state: PricingState, action: any): PricingState {
    const newState = this.cloneState(state);

    for (const item of newState.items) {
      if (item.productId === action.productId) {
        item.calculatedPrice = action.newPrice;
        item.priceAfterDiscount = action.newPrice;
      }
    }

    return newState;
  }

  applyItemPriceChangeToAll(state: PricingState, newPrice: number): PricingState {
    const newState = this.cloneState(state);

    for (const item of newState.items) {
      item.calculatedPrice = newPrice;
      item.priceAfterDiscount = newPrice;
    }

    return newState;
  }

  resetSubtotal(state: PricingState): PricingState {
    const newState = this.cloneState(state);

    newState.subtotal = state.items.reduce(
      (sum, item) => sum + item.priceAfterDiscount * item.qty,
      0
    );

    return newState;
  }

  calculateTotal(state: PricingState): number {
    const subtotal = state.items.reduce(
      (sum, item) => sum + item.priceAfterDiscount * item.qty,
      0
    );

    const shippingTotal = state.shipping;
    const taxTotal = state.taxes.reduce((sum, t) => sum + t.value, 0);
    const cashbackTotal = state.cashbacks.reduce((sum, c) => sum + c.value, 0);

    return subtotal + shippingTotal + taxTotal - cashbackTotal;
  }

  getAppliedDiscounts(state: PricingState): Discount[] {
    return state.discounts;
  }

  getAppliedWarnings(state: PricingState): any[] {
    return state.warnings;
  }

  getAppliedLogs(state: PricingState): Log[] {
    return state.logs;
  }
}
