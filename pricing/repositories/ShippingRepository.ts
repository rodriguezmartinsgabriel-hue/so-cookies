import { PrismaClient } from '@/src/generated/prisma/client';
import type { ShippingRate } from '@prisma/client';

export class ShippingRepository {
  constructor(private prisma: PrismaClient) {}

  async getRates(channel: string): Promise<ShippingRate[]> {
    return await this.prisma.shippingRate.findMany({
      where: { channel, enabled: true }
    });
  }

  async getRateByWeight(weightKg: number, channel: string): Promise<ShippingRate | null> {
    return await this.prisma.shippingRate.findFirst({
      where: {
        channel,
        enabled: true,
        minWeight: { lte: weightKg },
        maxWeight: { gte: weightKg }
      }
    });
  }

  async getRateByRegion(region: string, channel: string): Promise<ShippingRate | null> {
    return await this.prisma.shippingRate.findFirst({
      where: {
        channel,
        enabled: true,
        region: { equals: region }
      }
    });
  }

  async createRate(data: Partial<ShippingRate>): Promise<ShippingRate> {
    return await this.prisma.shippingRate.create({
      data
    });
  }

  async updateRate(id: string, data: Partial<ShippingRate>): Promise<ShippingRate> {
    return await this.prisma.shippingRate.update({
      where: { id },
      data
    });
  }

  async deleteRate(id: string): Promise<void> {
    await this.prisma.shippingRate.delete({
      where: { id }
    });
  }
}
