import { PrismaClient, Coupon } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class CouponRepository {
  constructor(private prisma: PrismaClient) {}

  async findByCode(code: string): Promise<Coupon | null> {
    return await this.prisma.coupon.findUnique({
      where: { code },
    });
  }

  async validateCode(code: string, channel: string): Promise<boolean> {
    const coupon = await this.findByCode(code);

    if (!coupon) return false;
    if (!coupon.active) return false;
    if (coupon.usedCount >= coupon.usageLimit) return false;

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

  async createCoupon(data: Prisma.CouponCreateInput): Promise<Coupon> {
    return await this.prisma.coupon.create({
      data: {
        ...data,
        usageLimit: data.usageLimit || 100,
        usedCount: 0,
        active: true,
        applicableProducts: data.applicableProducts || [],
        applicableTypes: data.applicableTypes || ['all'],
      }
    });
  }

  async updateCoupon(id: string, data: Prisma.CouponUpdateInput): Promise<Coupon> {
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






