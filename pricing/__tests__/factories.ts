import type {
  PrismaClient,
  Product,
  Customer,
  Coupon,
  Campaign,
  ShippingRate,
  PricingSettings,
  PriceTier,
} from "@/generated/prisma/client"
import type { PricingContext, ChannelConfig } from "../types"
import type { ProductRepository } from "../repositories/ProductRepository"
import type { CouponRepository } from "../repositories/CouponRepository"
import type { CampaignRepository } from "../repositories/CampaignRepository"
import type { ShippingRepository } from "../repositories/ShippingRepository"
import type { PricingRepository } from "../repositories/PricingRepository"
import type { LoyaltyRepository } from "../repositories/LoyaltyRepository"
import { Decimal } from "@prisma/client/runtime/client"

type ProductProps = Partial<Product>
type CustomerProps = Partial<Customer>
type CouponProps = Partial<Coupon>
type CampaignProps = Partial<Campaign>
type ShippingRateProps = Partial<ShippingRate>
type PricingSettingsProps = Partial<PricingSettings>
type PriceTierProps = Partial<PriceTier>

export const productFactory = (overrides: ProductProps = {}): Product =>
  ({
    id: "prod-1",
    name: "Cookie Clássico",
    sku: "COOK-001",
    category: "Cookies",
    price: new Decimal(15),
    cost: 5,
    margin: 66.67,
    unit: "un",
    active: true,
    image: null,
    deletedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  }) as Product

export const customerFactory = (overrides: CustomerProps = {}): Customer =>
  ({
    id: "cust-1",
    name: "João Silva",
    email: "joao@example.com",
    phone: "11999999999",
    password: null,
    addressCep: null,
    addressStreet: null,
    addressNumber: null,
    addressComplement: null,
    addressNeighborhood: null,
    addressCity: null,
    addressState: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  }) as Customer

export const couponFactory = (overrides: CouponProps = {}): Coupon =>
  ({
    id: "coupon-1",
    code: "WELCOME10",
    name: "Welcome 10%",
    description: null,
    type: "PERCENTAGE",
    value: new Decimal(10),
    minOrderValue: new Decimal(0),
    maxDiscount: null,
    usageLimit: 100,
    usedCount: 0,
    validFrom: new Date("2024-01-01"),
    validUntil: new Date("2026-12-31"),
    active: true,
    applicableProducts: [],
    applicableTypes: ["all"],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  }) as Coupon

export const campaignFactory = (overrides: CampaignProps = {}): Campaign =>
  ({
    id: "camp-1",
    name: "Black Friday",
    description: null,
    type: "PROMOTIONAL",
    priority: 0,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2026-12-31"),
    active: true,
    applicableProducts: [],
    usedCount: 0,
    conditions: { discountPercent: 15 },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  }) as Campaign

export const shippingRateFactory = (overrides: ShippingRateProps = {}): ShippingRate =>
  ({
    id: "rate-1",
    name: "Entrega Centro",
    channel: "delivery",
    zoneId: null,
    type: "FLAT_RATE",
    basePrice: new Decimal(10),
    pricePerKm: new Decimal(0),
    minOrderValue: new Decimal(0),
    freeShippingThreshold: null,
    enabled: true,
    minWeight: 0,
    maxWeight: 1000,
    region: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  }) as ShippingRate

export const pricingSettingsFactory = (overrides: PricingSettingsProps = {}): PricingSettings =>
  ({
    id: "default",
    key: "default",
    value: {
      activatePriceTier: true,
      activateCoupon: true,
      activateCampaign: true,
      activateB2B: true,
      activateFreeShipping: true,
      b2bDiscountPercent: 10,
    },
    description: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  }) as PricingSettings

export const priceTierFactory = (overrides: PriceTierProps = {}): PriceTier =>
  ({
    id: "tier-1",
    name: "Leve 5",
    minQty: 5,
    maxQty: null,
    price: new Decimal(12),
    enabled: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    productId: "prod-1",
    ...overrides,
  }) as PriceTier

export const channelConfigFactory = (overrides: Partial<ChannelConfig> = {}): ChannelConfig => ({
  id: "default",
  activatePriceTier: true,
  activateCoupon: true,
  activateCampaign: true,
  activateB2B: true,
  activateFreeShipping: true,
  b2bDiscountPercent: 10,
  activateLoyalty: true,
  pointsPerReal: 1,
  minOrderTotalForPoints: 0,
  roundingMode: "FLOOR",
  ...overrides,
})

export const pricingContextFactory = (overrides: Partial<PricingContext> = {}): PricingContext => ({
  items: [
    {
      productId: "prod-1",
      qty: 5,
      basePrice: 15,
      name: "Cookie Clássico",
    },
  ],
  channel: "pickup",
  customerType: "CLIENTE",
  ...overrides,
})

export const mockProductRepository = (products: Product[] = []): ProductRepository =>
  ({
    findByIds: () => Promise.resolve(products),
    getCustomerById: () => Promise.resolve(null),
  }) as unknown as ProductRepository

export const mockCouponRepository = (coupons: Coupon[] = []): CouponRepository =>
  ({
    findByCode: () => Promise.resolve(coupons[0] ?? null),
  }) as unknown as CouponRepository

export const mockCampaignRepository = (campaigns: Campaign[] = []): CampaignRepository =>
  ({
    findActive: () => Promise.resolve(campaigns),
  }) as unknown as CampaignRepository

export const mockShippingRepository = (rates: ShippingRate[] = []): ShippingRepository =>
  ({
    getRateByWeight: () => Promise.resolve(rates[0] ?? null),
    getRates: () => Promise.resolve(rates),
  }) as unknown as ShippingRepository

export const mockPricingRepository = (
  opts: {
    config?: ChannelConfig | null
    priceTiers?: Record<string, PriceTier[]>
  } = {},
): PricingRepository =>
  ({
    getSettings: () => Promise.resolve(null),
    getChannelConfig: () => Promise.resolve(opts.config ?? channelConfigFactory()),
    getActivePriceTiersForProducts: () => Promise.resolve(Object.values(opts.priceTiers ?? {}).flat()),
  }) as unknown as PricingRepository

export const mockLoyaltyRepository = (opts: { balance?: number } = {}): LoyaltyRepository =>
  ({
    getBalance: () => Promise.resolve({ data: opts.balance ?? 0, degraded: false }),
    getSettings: () => Promise.resolve({ activateLoyalty: true, pointsPerReal: 1, minOrderTotalForPoints: 0, roundingMode: "FLOOR" }),
    getAccountMeta: () => Promise.resolve({ data: null, degraded: false }),
  }) as unknown as LoyaltyRepository

export const mockConsole = () => ({
  log: () => void 0,
  error: () => void 0,
  warn: () => void 0,
  info: () => void 0,
  debug: () => void 0,
})

export const mockMetrics = () => ({
  record: () => void 0,
})

export const buildPricingDataLoaderDeps = (
  opts: {
    products?: Product[]
    coupons?: Coupon[]
    campaigns?: Campaign[]
    shippingRates?: ShippingRate[]
    config?: ChannelConfig | null
    priceTiers?: Record<string, PriceTier[]>
  } = {},
) => {
  const products = opts.products ?? [productFactory()]
  const coupons = opts.coupons ?? []
  const campaigns = opts.campaigns ?? []
  const shippingRates = opts.shippingRates ?? []
  const config = opts.config === undefined ? channelConfigFactory() : opts.config

  return {
    productRepository: mockProductRepository(products),
    couponRepository: mockCouponRepository(coupons),
    campaignRepository: mockCampaignRepository(campaigns),
    shippingRepository: mockShippingRepository(shippingRates),
    pricingRepository: mockPricingRepository({ config, priceTiers: opts.priceTiers }),
    loyaltyRepository: mockLoyaltyRepository(),
    priceTiers: opts.priceTiers ?? {},
  }
}

export type MockPrismaClient = Partial<PrismaClient>
