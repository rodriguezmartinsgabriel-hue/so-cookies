import type { PrismaClient, Product, Customer, Coupon, Campaign, ShippingRate, PricingSettings } from '@/generated/prisma/client';
import type { PricingContext } from '../types';
import type { ProductRepository } from '../repositories/ProductRepository';
import type { CouponRepository } from '../repositories/CouponRepository';
import type { CampaignRepository } from '../repositories/CampaignRepository';
import type { ShippingRepository } from '../repositories/ShippingRepository';
import type { PricingRepository } from '../repositories/PricingRepository';

type ProductProps = Partial<Product>;
type CustomerProps = Partial<Customer>;
type CouponProps = Partial<Coupon>;
type CampaignProps = Partial<Campaign>;
type ShippingRateProps = Partial<ShippingRate>;
type PricingSettingsProps = Partial<PricingSettings>;

export const productFactory = (overrides: ProductProps = {}): Product => ({
  id: 'prod-1',
  name: 'Cookie Clássico',
  description: null,
  category: 'Cookies',
  active: true,
  cost: 5,
  price: 15,
  weight: 80,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
} as Product);

export const customerFactory = (overrides: CustomerProps = {}): Customer => ({
  id: 'cust-1',
  name: 'João Silva',
  email: 'joao@example.com',
  phone: '11999999999',
  document: null,
  type: 'CLIENTE',
  active: true,
  deliveryAddress: null,
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
} as Customer);

export const couponFactory = (overrides: CouponProps = {}): Coupon => ({
  id: 'coupon-1',
  code: 'WELCOME10',
  name: 'Welcome 10%',
  type: 'PERCENTAGE',
  value: 10,
  minValue: 0,
  maxValue: null,
  usageLimit: null,
  usedCount: 0,
  active: true,
  startsAt: new Date('2024-01-01'),
  endsAt: new Date('2024-12-31'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
} as Coupon);

export const campaignFactory = (overrides: CampaignProps = {}): Campaign => ({
  id: 'camp-1',
  name: 'Black Friday',
  description: null,
  active: true,
  startsAt: new Date('2024-11-01'),
  endsAt: new Date('2024-11-30'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
} as Campaign);

export const shippingRateFactory = (overrides: ShippingRateProps = {}): ShippingRate => ({
  id: 'rate-1',
  zone: 'centro',
  minWeight: 0,
  maxWeight: 1000,
  cost: 10,
  active: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
} as ShippingRate);

export const pricingSettingsFactory = (overrides: PricingSettingsProps = {}): PricingSettings => ({
  id: 'settings-1',
  defaultShippingCost: 10,
  freeShippingThreshold: 100,
  taxRate: 0,
  active: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
} as PricingSettings);

export const pricingContextFactory = (overrides: Partial<PricingContext> = {}): PricingContext => ({
  items: [
    {
      productId: 'prod-1',
      qty: 5,
      basePrice: 15,
      name: 'Cookie Clássico',
    },
  ],
  channel: 'pickup',
  customerType: 'CLIENTE',
  ...overrides,
});

export const mockProductRepository = (products: Product[] = []): ProductRepository =>
  ({
    findByIds: () => Promise.resolve(products),
    getCustomerById: () => Promise.resolve(null),
  }) as unknown as ProductRepository;

export const mockCouponRepository = (coupons: Coupon[] = []): CouponRepository =>
  ({
    findByCode: () => Promise.resolve(coupons[0] ?? null),
  }) as unknown as CouponRepository;

export const mockCampaignRepository = (campaigns: Campaign[] = []): CampaignRepository =>
  ({
    findActive: () => Promise.resolve(campaigns),
  }) as unknown as CampaignRepository;

export const mockShippingRepository = (rates: ShippingRate[] = []): ShippingRepository =>
  ({
    getRateByWeight: () => Promise.resolve(rates[0] ?? null),
    getRates: () => Promise.resolve(rates),
  }) as unknown as ShippingRepository;

export const mockPricingRepository = (settings: PricingSettings | null = null): PricingRepository =>
  ({
    getSettings: () => Promise.resolve(settings),
    getActivePriceTiersForProducts: () => Promise.resolve([]),
  }) as unknown as PricingRepository;

export const mockConsole = () => ({
  log: () => void 0,
  error: () => void 0,
  warn: () => void 0,
  info: () => void 0,
  debug: () => void 0,
});

export const mockMetrics = () => ({
  record: () => void 0,
});

export const buildPricingDataLoaderDeps = (opts: {
  products?: Product[];
  coupons?: Coupon[];
  campaigns?: Campaign[];
  shippingRates?: ShippingRate[];
  settings?: PricingSettings | null;
} = {}) => {
  const products = opts.products ?? [productFactory()];
  const coupons = opts.coupons ?? [];
  const campaigns = opts.campaigns ?? [];
  const shippingRates = opts.shippingRates ?? [];
  const settings = opts.settings === undefined ? pricingSettingsFactory() : opts.settings;

  return {
    productRepository: mockProductRepository(products),
    couponRepository: mockCouponRepository(coupons),
    campaignRepository: mockCampaignRepository(campaigns),
    shippingRepository: mockShippingRepository(shippingRates),
    pricingRepository: mockPricingRepository(settings),
  };
};

export type MockPrismaClient = Partial<PrismaClient>;
