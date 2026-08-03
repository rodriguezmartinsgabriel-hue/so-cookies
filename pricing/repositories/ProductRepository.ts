import { PrismaClient } from '@/src/generated/prisma/client';
import type { Product } from '@prisma/client';

export class ProductRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(productId: string): Promise<Product | null> {
    return await this.prisma.product.findUnique({
      where: { id: productId }
    });
  }

  async findByIds(productIds: string[]): Promise<Product[]> {
    return await this.prisma.product.findMany({
      where: { id: { in: productIds } }
    });
  }

  async getActiveProducts(): Promise<Product[]> {
    return await this.prisma.product.findMany({
      where: { active: true }
    });
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return await this.prisma.product.findMany({
      where: { category, active: true }
    });
  }

  async getCustomerById(customerId: string): Promise<any> {
    // Placeholder - será implementado quando Customer for modelado
    return null;
  }
}
