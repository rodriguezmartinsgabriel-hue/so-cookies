import { PrismaClient, PriceTier, PricingSettings } from "@/generated/prisma/client"
import type { Prisma } from "@/generated/prisma/client"
import type { ChannelConfig } from "../types"

// Configuração padrão explícita (opt-in). Sem uma linha PricingSettings no banco,
// nenhuma promoção é ativada silenciosamente: cupons, campanhas, B2B e frete grátis
// só passam a valer quando o usuário criar/atualizar as configurações.
export const DEFAULT_CHANNEL_CONFIG: ChannelConfig = {
  id: "default",
  activatePriceTier: false,
  activateCoupon: false,
  activateCampaign: false,
  activateB2B: false,
  activateFreeShipping: false,
  b2bDiscountPercent: 0,
}

export const DEFAULT_CHANNEL_CONFIG_JSON = {
  activatePriceTier: false,
  activateCoupon: false,
  activateCampaign: false,
  activateB2B: false,
  activateFreeShipping: false,
  b2bDiscountPercent: 0,
}

export class PricingRepository {
  constructor(private prisma: PrismaClient) {}

  async getActivePriceTiersForProducts(productIds: string[]): Promise<PriceTier[]> {
    return await this.prisma.priceTier.findMany({
      where: {
        productId: { in: productIds },
        enabled: true,
      },
      orderBy: [{ minQty: "asc" }],
    })
  }

  async getSettings(): Promise<PricingSettings | null> {
    return await this.prisma.pricingSettings.findUnique({ where: { id: "default" } })
  }

  async updateSettings(data: Prisma.PricingSettingsUpdateInput): Promise<void> {
    await this.prisma.pricingSettings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data } as Prisma.PricingSettingsCreateInput,
    })
  }

  // Garante que a linha 'default' existe com configuração explícita (idempotente).
  async ensureDefaultSettings(): Promise<PricingSettings> {
    return await this.prisma.pricingSettings.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        key: "default",
        value: DEFAULT_CHANNEL_CONFIG_JSON,
        description: "Configuração padrão de precificação (opt-in)",
      },
    })
  }

  async getChannelConfig(channel: string): Promise<ChannelConfig> {
    void channel

    let settings = await this.getSettings()

    // Sem configuração explícita, nada é ativado silenciosamente e a linha
    // 'default' é criada para tornar o estado explícito nas próximas leituras.
    if (!settings) {
      settings = await this.ensureDefaultSettings()
    }

    const raw =
      settings.value && typeof settings.value === "object" && !Array.isArray(settings.value)
        ? (settings.value as Record<string, unknown>)
        : {}

    const flag = (key: string): boolean =>
      typeof raw[key] === "boolean"
        ? (raw[key] as boolean)
        : (DEFAULT_CHANNEL_CONFIG[key as keyof ChannelConfig] as boolean)

    return {
      id: settings.id ?? "default",
      activatePriceTier: flag("activatePriceTier"),
      activateCoupon: flag("activateCoupon"),
      activateCampaign: flag("activateCampaign"),
      activateB2B: flag("activateB2B"),
      activateFreeShipping: flag("activateFreeShipping"),
      b2bDiscountPercent:
        typeof raw.b2bDiscountPercent === "number"
          ? (raw.b2bDiscountPercent as number)
          : DEFAULT_CHANNEL_CONFIG.b2bDiscountPercent,
    }
  }
}
