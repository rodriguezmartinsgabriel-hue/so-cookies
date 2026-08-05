import { createId } from '../ids';
import type { PricingRule } from './PricingRule';
import type { PricingContext, PricingState, PricingData, Logger } from '../types';
import type { PricingAction } from '../actions/PricingAction';
import type { CouponRepository } from '../repositories/CouponRepository';
import { PricingPhase } from '../pipeline/PricingPhase';
import { EventBus } from '../events/EventBus';

export class CouponRule implements PricingRule {
  id = 'coupon';
  name = 'Cupom de Desconto';
  phase = PricingPhase.PAYMENT;
  weight = 3;
  priority = 3;
  enabled = true;

  constructor(
    private couponRepository: CouponRepository,
    private eventBus: EventBus,
    private logger: Logger
  ) {}

  canApplySync(context: PricingContext, _state: PricingState, data: PricingData): boolean {
    return Boolean(context.couponCode) && data.settings.activateCoupon;
  }

  async canApply(context: PricingContext, _state: PricingState, data: PricingData): Promise<boolean> {
    return this.canApplySync(context, _state, data);
  }

  async apply(context: PricingContext, state: PricingState, data: PricingData): Promise<PricingAction[]> {
    const actions: PricingAction[] = [];
    const code = context.couponCode;

    if (!code) {
      return actions;
    }

    const coupon = data.coupons.find(c => c.code.toLowerCase() === code.toLowerCase());

    if (!coupon) {
      return this.pushWarning(actions, `Cupom "${code}" não encontrado`);
    }

    const now = new Date();

    if (!coupon.active) {
      return this.pushWarning(actions, 'Cupom inativo');
    }

    if (coupon.validFrom && coupon.validFrom > now) {
      return this.pushWarning(actions, 'Cupom ainda não está ativo');
    }

    if (coupon.validUntil && coupon.validUntil < now) {
      return this.pushWarning(actions, 'Cupom expirado');
    }

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return this.pushWarning(actions, 'Cupom esgotado');
    }

    const appliesToChannel =
      coupon.applicableTypes.includes('all') ||
      coupon.applicableTypes.includes(context.channel);

    if (!appliesToChannel) {
      return this.pushWarning(actions, 'Cupom não é válido para este canal');
    }

    const subtotal = state.items.reduce(
      (sum, item) => sum + item.priceAfterDiscount * item.qty,
      0
    );

    if (coupon.minOrderValue > 0 && subtotal < coupon.minOrderValue) {
      return this.pushWarning(actions, `Pedido mínimo de R$ ${coupon.minOrderValue.toFixed(2)} para este cupom`);
    }

    const logBase = {
      couponId: coupon.id,
      couponCode: coupon.code,
      couponName: coupon.name,
      type: coupon.type
    };

    switch (coupon.type) {
      case 'PERCENTAGE': {
        actions.push({
          id: generateId(),
          type: 'ADD_DISCOUNT_PERCENTAGE',
          target: 'subtotal',
          value: coupon.value,
          percentage: coupon.value,
          appliedTo: 'subtotal',
          name: coupon.name,
          sourceRule: this.id,
          timestamp: now,
          metadata: logBase
        });
        break;
      }
      case 'FIXED_AMOUNT': {
        const maxDiscount = coupon.maxDiscount ?? subtotal;
        actions.push({
          id: generateId(),
          type: 'ADD_DISCOUNT_FIXED',
          target: 'subtotal',
          value: Math.min(coupon.value, maxDiscount),
          appliedTo: 'subtotal',
          name: coupon.name,
          sourceRule: this.id,
          timestamp: now,
          metadata: logBase
        });
        break;
      }
      case 'FREE_SHIPPING': {
        actions.push({
          id: generateId(),
          type: 'SET_FREE_SHIPPING',
          target: 'shipping',
          value: 0,
          name: coupon.name,
          sourceRule: this.id,
          timestamp: now,
          metadata: logBase
        });
        break;
      }
      case 'BUY_X_GET_Y': {
        actions.push({
          id: generateId(),
          type: 'ADD_WARNING',
          target: 'coupon',
          value: {
            message: 'Cupom de leva/ganha ainda não é suportado',
            couponCode: coupon.code
          },
          sourceRule: this.id,
          timestamp: now,
          metadata: logBase
        });
        return actions;
      }
    }

    actions.push({
      id: generateId(),
      type: 'ADD_LOG',
      target: 'coupon',
      value: {
        couponCode: coupon.code,
        couponName: coupon.name,
        type: coupon.type,
        value: coupon.value
      },
      sourceRule: this.id,
      timestamp: now,
      metadata: logBase
    });

    await this.eventBus.emit('CouponApplied', {
      couponCode: coupon.code,
      couponId: coupon.id,
      type: coupon.type,
      value: coupon.value
    });

    return actions;
  }

  getRuleName(): string {
    return this.name;
  }

  getPhase(): PricingPhase {
    return this.phase;
  }

  private pushWarning(actions: PricingAction[], message: string): PricingAction[] {
    actions.push({
      id: generateId(),
      type: 'ADD_WARNING',
      target: 'coupon',
      value: { message },
      sourceRule: this.id,
      timestamp: new Date()
    });
    return actions;
  }
}

function generateId(): string {
  return createId();
}
