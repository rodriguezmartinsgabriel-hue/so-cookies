import type { PricingContext } from '../types';
import type { Product } from '@prisma/client';
import { ProductRepository } from '../repositories/ProductRepository';
import { CouponRepository } from '../repositories/CouponRepository';
import { CampaignRepository } from '../repositories/CampaignRepository';
import { ShippingRepository } from '../repositories/ShippingRepository';
import { PricingRepository } from '../repositories/PricingRepository';
import { PricingCache } from '../cache/PricingCache';

export class PricingDataLoader {
  private cache: PricingCache;

  constructor(
    private productRepository: ProductRepository,
    private couponRepository: CouponRepository,
    private campaignRepository: CampaignRepository,
    private shippingRepository: ShippingRepository,
    private pricingRepository: PricingRepository,
    private cache: PricingCache
  ) {}

  async loadData(context: PricingContext): Promise<PricingData> {
    const startTime = Date.now();

    // 1. Carregar produtos
    const products = await this.loadProducts(context.items);

    // 2. Carregar dados do cliente (se existir)
    const customer = context.customerId
      ? await this.loadCustomer(context.customerId)
      : undefined;

    // 3. Carregar faixas de preço para todos os produtos
    const priceTiers = await this.loadPriceTiers(context.items);

    // 4. Carregar cupons
    const coupons = await this.loadCoupons(context.couponCode);

    // 5. Carregar campanhas ativas
    const campaigns = await this.loadActiveCampaigns();

    // 6. Carregar taxas de frete
    const shippingRates = await this.loadShippingRates(context.channel);

    // 7. Carregar configurações
    const settings = await this.loadSettings();

    console.log(`PricingDataLoader: Total load time: ${Date.now() - startTime}ms`);

    return {
      products,
      customer,
      priceTiers,
      coupons,
      campaigns,
      shippingRates,
      settings
    };
  }

  private async loadProducts(items: PricingContext['items']): Promise<Record<string, Product>> {
    const productIds = items.map(item => item.productId);
    const products = await this.productRepository.findByIds(productIds);

    return products.reduce((map, product) => {
      map[product.id] = product;
      return map;
    }, {} as Record<string, Product>);
  }

  private async loadCustomer(customerId: string): Promise<any> {
    // Placeholder - será implementado quando Customer for modelado
    return null;
  }

  private async loadPriceTiers(items: PricingContext['items']): Promise<Record<string, any[]>> {
    const productIds = items.map(item => item.productId);
    const tiers = await this.pricingRepository.getActivePriceTiersForProducts(productIds);

    return tiers.reduce((map, tier) => {
      if (!map[tier.productId]) {
        map[tier.productId] = [];
      }
      map[tier.productId].push(tier);
      return map;
    }, {} as Record<string, any[]>);
  }

  private async loadCoupons(couponCode?: string): Promise<any[]> {
    if (!couponCode) return [];

    const cacheKey = `coupon:${couponCode}`;
    const cached = this.cache.get(cacheKey);

    if (cached) return cached;

    const coupon = await this.couponRepository.findByCode(couponCode);

    if (coupon) {
      this.cache.set(cacheKey, coupon);
    }

    return coupon ? [coupon] : [];
  }

  private async loadActiveCampaigns(): Promise<any[]> {
    const cacheKey = 'campaigns:active';
    const cached = this.cache.get(cacheKey);

    if (cached) return cached;

    const campaigns = await this.campaignRepository.findActive();

    this.cache.set(cacheKey, campaigns);

    return campaigns;
  }

  private async loadShippingRates(channel: string): Promise<any[]> {
    const cacheKey = `shipping:${channel}`;
    const cached = this.cache.get(cacheKey);

    if (cached) return cached;

    const rates = await this.shippingRepository.getRates(channel);

    this.cache.set(cacheKey, rates);

    return rates;
  }

  private async loadSettings(): Promise<any> {
    const settings = await this.pricingRepository.getSettings();

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
}

export interface PricingData {
  products: Record<string, Product>;
  customer?: any;
  priceTiers: Record<string, any[]>;
  coupons: any[];
  campaigns: any[];
  shippingRates: any[];
  settings: any;
}
