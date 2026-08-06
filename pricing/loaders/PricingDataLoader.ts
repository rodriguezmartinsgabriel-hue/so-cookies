import type { PricingContext, PricingData, ChannelConfig } from "../types"
import type { Product, Customer, Coupon, Campaign, ShippingRate, PriceTier } from "@/generated/prisma/client"
import { ProductRepository } from "../repositories/ProductRepository"
import { CouponRepository } from "../repositories/CouponRepository"
import { CampaignRepository } from "../repositories/CampaignRepository"
import { ShippingRepository } from "../repositories/ShippingRepository"
import { PricingRepository } from "../repositories/PricingRepository"
import { PricingCache } from "../cache/PricingCache"

export class PricingDataLoader {
  constructor(
    private productRepository: ProductRepository,
    private couponRepository: CouponRepository,
    private campaignRepository: CampaignRepository,
    private shippingRepository: ShippingRepository,
    private pricingRepository: PricingRepository,
    private cache: PricingCache,
  ) {}

  async loadData(context: PricingContext): Promise<PricingData> {
    // 1. Carregar produtos
    const products = await this.loadProducts(context.items)

    // 2. Carregar dados do cliente (se existir)
    const customer = context.customerId ? await this.loadCustomer(context.customerId) : undefined

    // 3. Carregar faixas de preço para todos os produtos
    const priceTiers = await this.loadPriceTiers(context.items)

    // 4. Carregar cupons
    const coupons = await this.loadCoupons(context.couponCode)

    // 5. Carregar campanhas ativas
    const campaigns = await this.loadActiveCampaigns()

    // 6. Carregar taxas de frete
    const shippingRates = await this.loadShippingRates(context.channel)

    // 7. Carregar configurações do canal
    const settings = await this.loadChannelConfig(context.channel)

    return {
      products,
      customer,
      priceTiers,
      coupons,
      campaigns,
      shippingRates,
      settings,
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
