import { PrismaClient } from '@/src/generated/prisma/client';
import type { Campaign } from '@prisma/client';

export class CampaignRepository {
  constructor(private prisma: PrismaClient) {}

  async findActive(): Promise<Campaign[]> {
    const today = new Date();
    return await this.prisma.campaign.findMany({
      where: {
        active: true,
        startDate: { lte: today },
        endDate: { gte: today }
      }
    });
  }

  async findByProduct(productId: string): Promise<Campaign[]> {
    return await this.prisma.campaign.findMany({
      where: {
        active: true,
        applicableProducts: { has: productId }
      }
    });
  }

  async incrementUsage(campaignId: string, qty: number): Promise<void> {
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { usedCount: { increment: qty } }
    });
  }

  async createCampaign(data: Partial<Campaign>): Promise<Campaign> {
    return await this.prisma.campaign.create({
      data: {
        ...data,
        active: true,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      }
    });
  }

  async updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign> {
    return await this.prisma.campaign.update({
      where: { id },
      data
    });
  }

  async deleteCampaign(id: string): Promise<void> {
    await this.prisma.campaign.delete({
      where: { id }
    });
  }
}
