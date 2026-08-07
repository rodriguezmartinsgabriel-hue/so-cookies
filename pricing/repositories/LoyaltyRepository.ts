import { PrismaClient } from "@/generated/prisma/client"

export interface LoyaltySettings {
  activateLoyalty: boolean
  pointsPerReal: number
  minOrderTotalForPoints: number
  roundingMode: "FLOOR" | "CEIL" | "ROUND"
}

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  activateLoyalty: true,
  pointsPerReal: 1,
  minOrderTotalForPoints: 0,
  roundingMode: "FLOOR",
}

export const DEFAULT_LOYALTY_SETTINGS_JSON = {
  activateLoyalty: true,
  pointsPerReal: 1,
  minOrderTotalForPoints: 0,
  roundingMode: "FLOOR",
}

export class LoyaltyRepository {
  constructor(private prisma: PrismaClient) {}

  async getBalance(customerId: string): Promise<number> {
    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { customerId },
      select: { balance: true },
    })
    return account?.balance ?? 0
  }

  async getAccountMeta(customerId: string): Promise<{
    balance: number
    lifetimeEarned: number
    lifetimeSpent: number
  } | null> {
    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { customerId },
      select: { balance: true, lifetimeEarned: true, lifetimeSpent: true },
    })
    return account
  }

  async getSettings(): Promise<LoyaltySettings> {
    const settings = await this.prisma.pricingSettings.findUnique({ where: { id: "default" } })
    const raw =
      settings?.value && typeof settings.value === "object" && !Array.isArray(settings.value)
        ? (settings.value as Record<string, unknown>)
        : {}

    const num = (key: keyof LoyaltySettings, fallback: number): number =>
      typeof raw[key as string] === "number" ? (raw[key as string] as number) : fallback

    const modeRaw = raw.roundingMode
    const mode: LoyaltySettings["roundingMode"] =
      modeRaw === "FLOOR" || modeRaw === "CEIL" || modeRaw === "ROUND" ? modeRaw : "FLOOR"

    return {
      activateLoyalty:
        typeof raw.activateLoyalty === "boolean" ? raw.activateLoyalty : DEFAULT_LOYALTY_SETTINGS.activateLoyalty,
      pointsPerReal: num("pointsPerReal", DEFAULT_LOYALTY_SETTINGS.pointsPerReal),
      minOrderTotalForPoints: num("minOrderTotalForPoints", DEFAULT_LOYALTY_SETTINGS.minOrderTotalForPoints),
      roundingMode: mode,
    }
  }

  static computePoints(total: number, settings: LoyaltySettings): number {
    if (!settings.activateLoyalty) return 0
    if (total < settings.minOrderTotalForPoints) return 0
    const raw = total * settings.pointsPerReal
    if (settings.roundingMode === "CEIL") return Math.ceil(raw)
    if (settings.roundingMode === "ROUND") return Math.round(raw)
    return Math.floor(raw)
  }
}
