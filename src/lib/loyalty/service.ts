import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import type { LoyaltyBalanceView, LoyaltyRewardView, LoyaltyTransactionView } from "./types"
import { LoyaltyError } from "./types"

const DEFAULT_POINTS_PER_REAL = 1

function floorPoints(total: number, pointsPerReal: number): number {
  return Math.max(0, Math.floor(total * pointsPerReal))
}

export class LoyaltyService {
  static async ensureAccount(customerId: string): Promise<{ id: string; balance: number }> {
    const existing = await prisma.loyaltyAccount.findUnique({
      where: { customerId },
      select: { id: true, balance: true },
    })
    if (existing) return existing

    const created = await prisma.loyaltyAccount.upsert({
      where: { customerId },
      create: { customerId, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
      update: {},
      select: { id: true, balance: true },
    })
    return created
  }

  static async getBalance(customerId: string): Promise<LoyaltyBalanceView> {
    const account = await prisma.loyaltyAccount.findUnique({
      where: { customerId },
      select: { balance: true, lifetimeEarned: true, lifetimeSpent: true },
    })
    return {
      balance: account?.balance ?? 0,
      lifetimeEarned: account?.lifetimeEarned ?? 0,
      lifetimeSpent: account?.lifetimeSpent ?? 0,
    }
  }

  static async getSettings() {
    const settings = await prisma.pricingSettings.findUnique({ where: { id: "default" } })
    const raw =
      settings?.value && typeof settings.value === "object" && !Array.isArray(settings.value)
        ? (settings.value as Record<string, unknown>)
        : {}
    const pointsPerReal =
      typeof raw.pointsPerReal === "number" ? raw.pointsPerReal : DEFAULT_POINTS_PER_REAL
    const activateLoyalty = typeof raw.activateLoyalty === "boolean" ? raw.activateLoyalty : true
    const minOrderTotalForPoints =
      typeof raw.minOrderTotalForPoints === "number" ? raw.minOrderTotalForPoints : 0
    return { activateLoyalty, pointsPerReal, minOrderTotalForPoints }
  }

  static async creditOnPayment(orderId: string): Promise<{ credited: number; balanceAfter: number } | null> {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          customerId: true,
          total: true,
          paymentStatus: true,
          loyaltyEarned: true,
        },
      })

      if (!order) {
        logger.warn("[loyalty] creditOnPayment: pedido não encontrado", { orderId })
        return null
      }
      if (!order.customerId) {
        logger.warn("[loyalty] creditOnPayment: pedido sem customerId", { orderId })
        return null
      }
      if (order.paymentStatus !== "PAGO") {
        logger.warn("[loyalty] creditOnPayment: pedido não está PAGO", { orderId, paymentStatus: order.paymentStatus })
        return null
      }
      if (order.loyaltyEarned) {
        return null
      }

      const { activateLoyalty, pointsPerReal, minOrderTotalForPoints } = await this.getSettingsInTx(tx)
      if (!activateLoyalty) {
        await tx.order.update({
          where: { id: order.id },
          data: { loyaltyEarned: true, loyaltyPoints: 0 },
        })
        return { credited: 0, balanceAfter: 0 }
      }

      const total = order.total && typeof (order.total as { toNumber?: () => number }).toNumber === "function"
        ? (order.total as { toNumber: () => number }).toNumber()
        : Number(order.total)
      if (total < minOrderTotalForPoints) {
        await tx.order.update({
          where: { id: order.id },
          data: { loyaltyEarned: true, loyaltyPoints: 0 },
        })
        return { credited: 0, balanceAfter: 0 }
      }
      const points = floorPoints(total, pointsPerReal)
      if (points <= 0) {
        await tx.order.update({
          where: { id: order.id },
          data: { loyaltyEarned: true, loyaltyPoints: 0 },
        })
        return { credited: 0, balanceAfter: 0 }
      }

      const account = await this.ensureAccountInTx(tx, order.customerId)

      const updated = await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          balance: { increment: points },
          lifetimeEarned: { increment: points },
        },
        select: { balance: true },
      })

      await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: "EARN",
          points,
          balanceAfter: updated.balance,
          reason: `Pedido #${order.id.slice(0, 8)} pago`,
          orderId: order.id,
          metadata: { orderTotal: total, pointsPerReal },
        },
      })

      await tx.order.update({
        where: { id: order.id },
        data: { loyaltyEarned: true, loyaltyPoints: points },
      })

      logger.info("[loyalty] pontos creditados", {
        orderId,
        customerId: order.customerId,
        points,
        balanceAfter: updated.balance,
      })

      return { credited: points, balanceAfter: updated.balance }
    })
  }

  static async refundOnCancel(orderId: string): Promise<{ refunded: number; balanceAfter: number } | null> {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          customerId: true,
          paymentStatus: true,
          loyaltyEarned: true,
          loyaltyPoints: true,
          loyaltyRefunded: true,
        },
      })

      if (!order) {
        logger.warn("[loyalty] refundOnCancel: pedido não encontrado", { orderId })
        return null
      }
      if (!order.customerId) {
        return null
      }
      if (!order.loyaltyEarned || order.loyaltyRefunded) {
        return null
      }
      if (order.paymentStatus !== "PAGO") {
        return null
      }

      const points = order.loyaltyPoints ?? 0
      if (points <= 0) {
        await tx.order.update({
          where: { id: order.id },
          data: { loyaltyRefunded: true },
        })
        return { refunded: 0, balanceAfter: 0 }
      }

      const account = await this.ensureAccountInTx(tx, order.customerId)

      const currentBalance = await tx.loyaltyAccount.findUnique({
        where: { id: account.id },
        select: { balance: true },
      })
      const current = currentBalance?.balance ?? 0
      const debit = Math.min(points, current)
      if (debit <= 0) {
        await tx.order.update({
          where: { id: order.id },
          data: { loyaltyRefunded: true },
        })
        logger.warn("[loyalty] refundOnCancel: saldo insuficiente, sem débito", {
          orderId,
          customerId: order.customerId,
          requested: points,
          balance: current,
        })
        return { refunded: 0, balanceAfter: current }
      }

      const updated = await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          balance: { decrement: debit },
          lifetimeSpent: { increment: debit },
        },
        select: { balance: true },
      })

      await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: "REFUND",
          points: debit,
          balanceAfter: updated.balance,
          reason: `Cancelamento do pedido #${order.id.slice(0, 8)}`,
          orderId: order.id,
          metadata: { refundedFrom: points, requestedRefund: points },
        },
      })

      await tx.order.update({
        where: { id: order.id },
        data: { loyaltyRefunded: true },
      })

      logger.info("[loyalty] pontos estornados", {
        orderId,
        customerId: order.customerId,
        refunded: debit,
        balanceAfter: updated.balance,
      })

      return { refunded: debit, balanceAfter: updated.balance }
    })
  }

  static async getTransactions(
    customerId: string,
    opts: { limit?: number; cursor?: string | null } = {},
  ): Promise<{ items: LoyaltyTransactionView[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50)
    const account = await prisma.loyaltyAccount.findUnique({
      where: { customerId },
      select: { id: true },
    })
    if (!account) return { items: [], nextCursor: null }

    const transactions = await prisma.loyaltyTransaction.findMany({
      where: { accountId: account.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        type: true,
        points: true,
        balanceAfter: true,
        reason: true,
        orderId: true,
        createdAt: true,
      },
    })

    const hasMore = transactions.length > limit
    const items = transactions.slice(0, limit)
    return {
      items: items.map((t) => ({
        id: t.id,
        type: t.type as LoyaltyTransactionView["type"],
        points: t.points,
        balanceAfter: t.balanceAfter,
        reason: t.reason,
        orderId: t.orderId,
        createdAt: t.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    }
  }

  static async listRewards(): Promise<LoyaltyRewardView[]> {
    const now = new Date()
    const rewards = await prisma.loyaltyReward.findMany({
      where: {
        enabled: true,
        OR: [{ validFrom: null }, { validFrom: { lte: now } }],
        AND: [{ OR: [{ validUntil: null }, { validUntil: { gte: now } }] }],
      },
      orderBy: [{ pointsCost: "asc" }],
    })
    return rewards.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      image: r.image,
      pointsCost: r.pointsCost,
      type: r.type,
      enabled: r.enabled,
      stock: r.stock,
    }))
  }

  static computePreview(
    total: number,
    currentBalance: number,
    settings: { activateLoyalty: boolean; pointsPerReal: number; minOrderTotalForPoints: number },
  ): { pointsToEarn: number; projectedAfter: number } {
    if (!settings.activateLoyalty || total < settings.minOrderTotalForPoints) {
      return { pointsToEarn: 0, projectedAfter: currentBalance }
    }
    const pointsToEarn = floorPoints(total, settings.pointsPerReal)
    return { pointsToEarn, projectedAfter: currentBalance + pointsToEarn }
  }

  private static async getSettingsInTx(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  ): Promise<{ activateLoyalty: boolean; pointsPerReal: number; minOrderTotalForPoints: number }> {
    const settings = await tx.pricingSettings.findUnique({ where: { id: "default" } })
    const raw =
      settings?.value && typeof settings.value === "object" && !Array.isArray(settings.value)
        ? (settings.value as Record<string, unknown>)
        : {}
    return {
      activateLoyalty: typeof raw.activateLoyalty === "boolean" ? raw.activateLoyalty : true,
      pointsPerReal: typeof raw.pointsPerReal === "number" ? raw.pointsPerReal : DEFAULT_POINTS_PER_REAL,
      minOrderTotalForPoints: typeof raw.minOrderTotalForPoints === "number" ? raw.minOrderTotalForPoints : 0,
    }
  }

  private static async ensureAccountInTx(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    customerId: string,
  ): Promise<{ id: string; balance: number }> {
    const existing = await tx.loyaltyAccount.findUnique({
      where: { customerId },
      select: { id: true, balance: true },
    })
    if (existing) return existing

    return tx.loyaltyAccount.upsert({
      where: { customerId },
      create: { customerId, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
      update: {},
      select: { id: true, balance: true },
    })
  }
}

export { LoyaltyError }
