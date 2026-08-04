// Type base de ações de preço
export interface PricingAction {
  id: string;
  sourceRule: string;
  timestamp: Date;
  type: PricingActionType;
  target: string;
  value: unknown;
  metadata?: Record<string, unknown>;
  // Campos específicos por tipo de ação (opcionais)
  appliedTo?: 'items' | 'subtotal';
  percentage?: number;
  name?: string;
  message?: string;
  productId?: string;
  newPrice?: number;
}

// Tipos de ações disponíveis
export type PricingActionType =
  | 'ADD_DISCOUNT_PERCENTAGE'
  | 'ADD_DISCOUNT_FIXED'
  | 'CHANGE_ITEM_PRICE'
  | 'ADD_SHIPPING'
  | 'SET_FREE_SHIPPING'
  | 'ADD_CASHBACK'
  | 'ADD_TAX'
  | 'ADD_BONUS'
  | 'ADD_WARNING'
  | 'ADD_LOG'
  | 'BLOCK_CHECKOUT';






