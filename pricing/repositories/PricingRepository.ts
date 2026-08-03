import { PrismaClient } from '@/src/generated/prisma/client';
import type { PricingSettings } from '@prisma/client';
import type { PriceTier } from '@prisma/client';

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
    return await this.prisma.pricingSettings.findFirst();
  }

  async updateSettings(settings: PricingSettings): Promise<void> {
    await this.prisma.pricingSettings.upsert({
      where: { id: 'default' },
      update: settings,
      create: { ...settings, id: 'default' }
    });
  }

  async getSettingsForChannel(channel: string): Promise<PricingSettings> {
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

  async createPriceTier(data: Partial<PriceTier>): Promise<PriceTier> {
    return await this.prisma.priceTier.create({
      data
    });
  }

  async updatePriceTier(id: string, data: Partial<PriceTier>): Promise<PriceTier> {
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
