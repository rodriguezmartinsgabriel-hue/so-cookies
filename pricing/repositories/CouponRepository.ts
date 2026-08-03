import { PrismaClient } from '@/src/generated/prisma/client';
import type { Coupon } from '@prisma/client';

export class CouponRepository {
  constructor(private prisma: PrismaClient) {}

  async findByCode(code: string): Promise<Coupon | null> {
    return await this.prisma.coupon.findUnique({
      where: { code },
      include: {
        applicableProducts: true,
        applicableTypes: true
      }
    });
  }

  async validateCode(code: string, channel: string): Promise<boolean> {
    const coupon = await this.findByCode(code);

    if (!coupon) return false;
    if (!coupon.enabled) return false;
    if (coupon.usedCount >= coupon.maxUsage!) return false;

    const today = new Date();
    if (coupon.validUntil && coupon.validUntil < today) return false;

    return coupon.applicableTypes.includes(channel) ||
           coupon.applicableTypes.includes('all');
  }

  async incrementUsage(couponId: string): Promise<void> {
    await this.prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } }
    });
  }

  async createCoupon(data: Partial<Coupon>): Promise<Coupon> {
    return await this.prisma.coupon.create({
      data: {
        ...data,
        maxUsage: data.maxUsage || 100,
        usedCount: 0,
        enabled: true
      }
    });
  }

  async updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon> {
    return await this.prisma.coupon.update({
      where: { id },
      data
    });
  }

  async deleteCoupon(id: string): Promise<void> {
    await this.prisma.coupon.delete({
      where: { id }
    });
  }
}
