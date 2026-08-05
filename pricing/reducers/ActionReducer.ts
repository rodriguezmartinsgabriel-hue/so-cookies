import type { PricingState, Discount, Log, Cashback, Tax, Bonus, Warning } from '../types';
import type { PricingAction } from '../actions/PricingAction';

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
          newState.shipping = { cost: action.value as number };
          break;
        case 'SET_FREE_SHIPPING':
          newState.freeShipping = true;
          newState.shipping = { cost: 0 };
          break;
        case 'ADD_CASHBACK':
          newState.cashbacks.push(action.value as Cashback);
          break;
        case 'ADD_TAX':
          newState.taxes.push(action.value as Tax);
          break;
        case 'ADD_BONUS':
          newState.bonuses.push(action.value as Bonus);
          break;
        case 'ADD_WARNING':
          newState.warnings.push(action.value as Warning);
          break;
        case 'ADD_LOG':
          newState.logs.push(action.value as Log);
          break;
        case 'BLOCK_CHECKOUT':
          newState.blocked = true;
          newState.blockedReason = action.message;
          break;
      }
    }

    return newState;
  }

  private applyDiscount(state: PricingState, action: PricingAction): PricingState {
    const newState = this.cloneState(state);

    const currentSubtotal = newState.items.reduce(
      (sum, item) => sum + item.priceAfterDiscount * item.qty,
      0
    );

    let value = action.value as number;
    let percentage = action.percentage || 0;

    // Desconto de pedido (subtotal): o valor monetário é calculado aqui e usado no total.
    // Descontos de item (tier) são informativos — o preço do item já foi reduzido.
    if (action.appliedTo === 'subtotal') {
      if (action.type === 'ADD_DISCOUNT_PERCENTAGE') {
        percentage = Math.max(0, Math.min(100, action.percentage || 0));
        value = (currentSubtotal * percentage) / 100;
      } else {
        value = Math.max(0, Math.min(value, currentSubtotal));
      }
      newState.subtotal = Math.max(0, currentSubtotal - value);
    }

    const discount: Discount = {
      id: action.id,
      name: action.name || 'Desconto',
      type: action.type === 'ADD_DISCOUNT_PERCENTAGE' ? 'PERCENTAGE' : 'FIXED',
      value,
      percentage,
      appliedTo: action.appliedTo
    };

    newState.discounts.push(discount);

    return newState;
  }

  private applyItemPriceChange(state: PricingState, action: PricingAction): PricingState {
    const newState = this.cloneState(state);

    for (const item of newState.items) {
      if (item.productId === action.productId) {
        item.calculatedPrice = action.newPrice as number;
        item.priceAfterDiscount = action.newPrice as number;
      }
    }

    return newState;
  }
}






