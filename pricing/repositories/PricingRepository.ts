import { PrismaClient, PriceTier, PricingSettings } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class PricingRepository {
  constructor(private prisma: PrismaClient) {}

  async getActivePriceTiers(productId: string): Promise<PriceTier[]> {
    return await this.prisma.priceTier.findMany({
      where: { productId, enabled: true },
      orderBy: [{ minQty: 'asc' }]
    });
  }

  async getActivePriceTiersForProducts(productIds: string[]): Promise<PriceTier[]> {
    return await this.prisma.priceTier.findMany({
      where: {
        productId: { in: productIds },
        enabled: true
      },
      orderBy: [{ minQty: 'asc' }]
    });
  }

  async getSettings(): Promise<PricingSettings | null> {
    return await this.prisma.pricingSettings.findUnique({ where: { id: 'default' } });
  }

  async updateSettings(data: Prisma.PricingSettingsUpdateInput): Promise<void> {
    await this.prisma.pricingSettings.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data } as Prisma.PricingSettingsCreateInput
    });
  }

  async getSettingsForChannel(channel: string): Promise<any> {
    const settings = await this.getSettings();

    if (!settings) {
      return {
        id: 'default',
        activatePriceTier: true,
        activateCoupon: false,
        activateCampaign: false,
        activateB2B: false,
        activateFreeShipping: false
      };
    }

    return settings;
  }

  async createPriceTier(data: Prisma.PriceTierCreateInput): Promise<PriceTier> {
    return await this.prisma.priceTier.create({
      data
    });
  }

  async updatePriceTier(id: string, data: Prisma.PriceTierUpdateInput): Promise<PriceTier> {
    return await this.prisma.priceTier.update({
      where: { id },
      data
    });
  }

  async deletePriceTier(id: string): Promise<void> {
    await this.prisma.priceTier.delete({
      where: { id }
    });
  }
}






