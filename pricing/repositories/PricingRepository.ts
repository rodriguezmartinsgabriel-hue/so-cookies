import { PrismaClient, PriceTier, PricingSettings } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import type { ChannelConfig } from '../types';

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

  async getChannelConfig(channel: string): Promise<ChannelConfig> {
    void channel;
    const settings = await this.getSettings();

    const raw = settings?.value && typeof settings.value === 'object' && !Array.isArray(settings.value)
      ? settings.value as Record<string, unknown>
      : {};

    const flag = (key: string, fallback: boolean): boolean =>
      typeof raw[key] === 'boolean' ? (raw[key] as boolean) : fallback;

    return {
      id: settings?.id ?? 'default',
      activatePriceTier: flag('activatePriceTier', true),
      activateCoupon: flag('activateCoupon', true),
      activateCampaign: flag('activateCampaign', true),
      activateB2B: flag('activateB2B', true),
      activateFreeShipping: flag('activateFreeShipping', true),
      b2bDiscountPercent: typeof raw.b2bDiscountPercent === 'number' ? (raw.b2bDiscountPercent as number) : 10,
    };
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






