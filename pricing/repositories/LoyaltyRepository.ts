import { PrismaClient } from "@/generated/prisma/client"

export interface LoyaltySettings {
  activateLoyalty: boolean
  pointsPerReal: number
  minOrderTotalForPoints: number
  roundingMode: "FLOOR" | "CEIL" | "ROUND"
}

export interface LoyaltyReadResult<T> {
  data: T
  /** True quando a query falhou (ex.: migration de loyalty ainda não aplicada). */
  degraded: boolean
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

const isMissingTableError = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false
  const code = (err as { code?: unknown }).code
  if (code === "P2021" || code === "P2025") return true
  const msg = (err as { message?: unknown }).message
  if (typeof msg === "string" && /does not exist in the current database/i.test(msg)) return true
  return false
}

export class LoyaltyRepository {
  constructor(private prisma: PrismaClient, private logger?: { warn?: (...args: unknown[]) => void }) {}

  async getBalance(customerId: string): Promise<LoyaltyReadResult<number>> {
    try {
      const account = await this.prisma.loyaltyAccount.findUnique({
        where: { customerId },
        select: { balance: true },
      })
      return { data: account?.balance ?? 0, degraded: false }
    } catch (err) {
      this.logger?.warn?.(`[LoyaltyRepository] getBalance falhou: ${(err as Error).message}`)
      return { data: 0, degraded: isMissingTableError(err) }
    }
  }

  async getAccountMeta(
    customerId: string,
  ): Promise<LoyaltyReadResult<{ balance: number; lifetimeEarned: number; lifetimeSpent: number } | null>> {
    try {
      const account = await this.prisma.loyaltyAccount.findUnique({
        where: { customerId },
        select: { balance: true, lifetimeEarned: true, lifetimeSpent: true },
      })
      return { data: account, degraded: false }
    } catch (err) {
      this.logger?.warn?.(`[LoyaltyRepository] getAccountMeta falhou: ${(err as Error).message}`)
      return { data: null, degraded: isMissingTableError(err) }
    }
  }

  async getSettings(): Promise<LoyaltySettings> {
    try {
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
    } catch (err) {
      this.logger?.warn?.(`[LoyaltyRepository] getSettings falhou: ${(err as Error).message}`)
      return DEFAULT_LOYALTY_SETTINGS
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

