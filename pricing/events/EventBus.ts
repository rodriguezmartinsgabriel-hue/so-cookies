export type PricingEventType =
  | 'CouponApplied'
  | 'CashbackGranted'
  | 'CheckoutBlocked'
  | 'OrderCalculated'
  | 'PriceChanged'
  | 'DiscountApplied'
  | 'ShippingCalculated';

export interface PricingEvent {
  id: string;
  type: PricingEventType;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

export class EventBus {
  private listeners = new Map<PricingEventType, Array<(event: PricingEvent) => void>>();

  on(eventType: PricingEventType, listener: (event: PricingEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  off(eventType: PricingEventType, listener: (event: PricingEvent) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  async emit(eventType: PricingEventType, data: any, metadata?: Record<string, any>): Promise<void> {
    const event: PricingEvent = {
      id: generateId(),
      type: eventType,
      timestamp: new Date(),
      data,
      metadata
    };

    const listeners = this.listeners.get(eventType);
    if (listeners) {
      await Promise.all(listeners.map(listener => listener(event)));
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  getListenerCount(eventType: PricingEventType): number {
    return this.listeners.get(eventType)?.length || 0;
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
