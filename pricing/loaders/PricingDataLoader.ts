import type { PricingContext, PricingData, ChannelConfig } from "../types"
import type { Product, Customer, Coupon, Campaign, ShippingRate, PriceTier } from "@/generated/prisma/client"
import { ProductRepository } from "../repositories/ProductRepository"
import { CouponRepository } from "../repositories/CouponRepository"
import { CampaignRepository } from "../repositories/CampaignRepository"
import { ShippingRepository } from "../repositories/ShippingRepository"
import { PricingRepository } from "../repositories/PricingRepository"
import { LoyaltyRepository } from "../repositories/LoyaltyRepository"
import { PricingCache } from "../cache/PricingCache"

export class PricingDataLoader {
  constructor(
    private productRepository: ProductRepository,
    private couponRepository: CouponRepository,
    private campaignRepository: CampaignRepository,
    private shippingRepository: ShippingRepository,
    private pricingRepository: PricingRepository,
    private loyaltyRepository: LoyaltyRepository,
    private cache: PricingCache,
  ) {}

  async loadData(context: PricingContext): Promise<PricingData> {
    // Carrega todos os dados em paralelo (queries independentes entre si).
    // Antes eram 8 awaits em série; agora o tempo cai para o da query mais lenta.
    const loyaltyPromise = context.customerId
      ? this.loyaltyRepository.getBalance(context.customerId)
      : Promise.resolve({ data: 0, degraded: false })

    const [products, customer, priceTiers, coupons, campaigns, shippingRates, settings, loyaltyResult] =
      await Promise.all([
        this.loadProducts(context.items),
        context.customerId ? this.loadCustomer(context.customerId) : Promise.resolve(undefined),
        this.loadPriceTiers(context.items),
        this.loadCoupons(context.couponCode),
        this.loadActiveCampaigns(),
        this.loadShippingRates(context.channel),
        this.loadChannelConfig(context.channel),
        // Saldo do programa de pontos (se houver cliente). Operação best-effort:
        // falhas aqui nunca devem quebrar o cálculo de preço.
        loyaltyPromise,
      ])

    return {
      products,
      customer,
      priceTiers,
      coupons,
      campaigns,
      shippingRates,
      settings,
      loyaltyBalance: loyaltyResult.data,
      loyaltyDegraded: loyaltyResult.degraded,
    }
  }

  private async loadProducts(items: PricingContext["items"]): Promise<Record<string, Product>> {
    const productIds = items.map((item) => item.productId)
    const products = await this.productRepository.findByIds(productIds)

    return products.reduce(
      (map, product) => {
        map[product.id] = product
        return map
      },
      {} as Record<string, Product>,
    )
  }

  private async loadCustomer(customerId: string): Promise<Customer | null> {
    return await this.productRepository.getCustomerById(customerId)
  }

  private async loadPriceTiers(items: PricingContext["items"]): Promise<Record<string, PriceTier[]>> {
    const productIds = items.map((item) => item.productId)
    const tiers = await this.pricingRepository.getActivePriceTiersForProducts(productIds)

    return tiers.reduce(
      (map, tier) => {
        if (!map[tier.productId]) {
          map[tier.productId] = []
        }
        map[tier.productId].push(tier)
        return map
      },
      {} as Record<string, PriceTier[]>,
    )
  }

  private async loadCoupons(couponCode?: string): Promise<Coupon[]> {
    if (!couponCode) return []

    const cacheKey = `coupon:${couponCode}`
    const cached = this.cache.get<Coupon[]>(cacheKey)

    if (cached) return cached

    const coupon = await this.couponRepository.findByCode(couponCode)

    if (coupon) {
      this.cache.set(cacheKey, [coupon])
    }

    return coupon ? [coupon] : []
  }

  private async loadActiveCampaigns(): Promise<Campaign[]> {
    const cacheKey = "campaigns:active"
    const cached = this.cache.get<Campaign[]>(cacheKey)

    if (cached) return cached

    const campaigns = await this.campaignRepository.findActive()

    this.cache.set(cacheKey, campaigns)

    return campaigns
  }

  private async loadShippingRates(channel: string): Promise<ShippingRate[]> {
    const cacheKey = `shipping:${channel}`
    const cached = this.cache.get<ShippingRate[]>(cacheKey)

    if (cached) return cached

    const rates = await this.shippingRepository.getRates(channel)

    this.cache.set(cacheKey, rates)

    return rates
  }

  private async loadChannelConfig(channel: string): Promise<ChannelConfig> {
    return await this.pricingRepository.getChannelConfig(channel)
  }
}
