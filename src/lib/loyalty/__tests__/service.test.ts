import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    loyaltyAccount: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    loyaltyTransaction: { create: vi.fn(), findMany: vi.fn() },
    loyaltyReward: { findMany: vi.fn() },
    pricingSettings: { findUnique: vi.fn() },
    order: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { prisma } from "@/lib/prisma"
import { LoyaltyService } from "@/lib/loyalty/service"

const mockedPrisma = prisma as unknown as {
  $transaction: ReturnType<typeof vi.fn>
  loyaltyAccount: {
    findUnique: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  loyaltyTransaction: { create: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
  loyaltyReward: { findMany: ReturnType<typeof vi.fn> }
  pricingSettings: { findUnique: ReturnType<typeof vi.fn> }
  order: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
}

function makeTx() {
  return {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    loyaltyAccount: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    loyaltyTransaction: { create: vi.fn() },
    pricingSettings: { findUnique: vi.fn(),
  },
  }
}

describe("LoyaltyService.computePreview", () => {
  it("arredonda para baixo (FLOOR)", () => {
    expect(
      LoyaltyService.computePreview(99.9, 0, { activateLoyalty: true, pointsPerReal: 1, minOrderTotalForPoints: 0 }),
    ).toEqual({ pointsToEarn: 99, projectedAfter: 99 })
  })

  it("respeita minOrderTotalForPoints", () => {
    expect(
      LoyaltyService.computePreview(5, 0, { activateLoyalty: true, pointsPerReal: 1, minOrderTotalForPoints: 10 }),
    ).toEqual({ pointsToEarn: 0, projectedAfter: 0 })
  })

  it("respeita activateLoyalty=false", () => {
    expect(
      LoyaltyService.computePreview(100, 50, { activateLoyalty: false, pointsPerReal: 1, minOrderTotalForPoints: 0 }),
    ).toEqual({ pointsToEarn: 0, projectedAfter: 50 })
  })

  it("suporta múltiplos pontos por real", () => {
    expect(
      LoyaltyService.computePreview(10, 5, { activateLoyalty: true, pointsPerReal: 2, minOrderTotalForPoints: 0 }),
    ).toEqual({ pointsToEarn: 20, projectedAfter: 25 })
  })
})

describe("LoyaltyService.creditOnPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("credita floor(total) pontos quando pedido vira PAGO pela primeira vez", async () => {
    const tx = makeTx()
    tx.order.findUnique.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      total: { toNumber: () => 87.9 },
      paymentStatus: "PAGO",
      loyaltyEarned: false,
    })
    tx.pricingSettings.findUnique.mockResolvedValue({
      value: { activateLoyalty: true, pointsPerReal: 1, minOrderTotalForPoints: 0 },
    })
    tx.loyaltyAccount.upsert.mockResolvedValue({ id: "acc-1", balance: 0 })
    tx.loyaltyAccount.update.mockResolvedValue({ balance: 87 })
    tx.order.update.mockResolvedValue({})
    tx.loyaltyTransaction.create.mockResolvedValue({})
    ;(mockedPrisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: ReturnType<typeof makeTx>) => unknown) => fn(tx),
    )

    const result = await LoyaltyService.creditOnPayment("ord-1")

    expect(result).toEqual({ credited: 87, balanceAfter: 87 })
    expect(tx.loyaltyAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "acc-1" },
        data: expect.objectContaining({
          balance: { increment: 87 },
          lifetimeEarned: { increment: 87 },
        }),
      }),
    )
    expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "EARN",
          points: 87,
          balanceAfter: 87,
          orderId: "ord-1",
        }),
      }),
    )
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ord-1" },
        data: expect.objectContaining({ loyaltyEarned: true, loyaltyPoints: 87 }),
      }),
    )
  })

  it("é idempotente: chamar 2x não credita 2x", async () => {
    const tx = makeTx()
    tx.order.findUnique.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      total: { toNumber: () => 50 },
      paymentStatus: "PAGO",
      loyaltyEarned: true,
    })
    ;(mockedPrisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: ReturnType<typeof makeTx>) => unknown) => fn(tx),
    )

    const result = await LoyaltyService.creditOnPayment("ord-1")

    expect(result).toBeNull()
    expect(tx.loyaltyAccount.update).not.toHaveBeenCalled()
    expect(tx.loyaltyTransaction.create).not.toHaveBeenCalled()
  })

  it("não credita quando paymentStatus não é PAGO", async () => {
    const tx = makeTx()
    tx.order.findUnique.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      total: { toNumber: () => 50 },
      paymentStatus: "AGUARDANDO_PAGAMENTO",
      loyaltyEarned: false,
    })
    ;(mockedPrisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: ReturnType<typeof makeTx>) => unknown) => fn(tx),
    )

    const result = await LoyaltyService.creditOnPayment("ord-1")

    expect(result).toBeNull()
    expect(tx.loyaltyAccount.update).not.toHaveBeenCalled()
  })

  it("não credita quando activateLoyalty=false", async () => {
    const tx = makeTx()
    tx.order.findUnique.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      total: { toNumber: () => 50 },
      paymentStatus: "PAGO",
      loyaltyEarned: false,
    })
    tx.pricingSettings.findUnique.mockResolvedValue({
      value: { activateLoyalty: false, pointsPerReal: 1, minOrderTotalForPoints: 0 },
    })
    tx.order.update.mockResolvedValue({})
    ;(mockedPrisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: ReturnType<typeof makeTx>) => unknown) => fn(tx),
    )

    const result = await LoyaltyService.creditOnPayment("ord-1")

    expect(result).toEqual({ credited: 0, balanceAfter: 0 })
    expect(tx.loyaltyAccount.update).not.toHaveBeenCalled()
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ loyaltyEarned: true, loyaltyPoints: 0 }),
      }),
    )
  })
})

describe("LoyaltyService.refundOnCancel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("estorna a mesma quantidade de pontos creditados quando pedido pago é cancelado", async () => {
    const tx = makeTx()
    tx.order.findUnique.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      paymentStatus: "PAGO",
      loyaltyEarned: true,
      loyaltyPoints: 87,
      loyaltyRefunded: false,
    })
    tx.loyaltyAccount.upsert.mockResolvedValue({ id: "acc-1", balance: 100 })
    tx.loyaltyAccount.findUnique.mockResolvedValue({ balance: 100 })
    tx.loyaltyAccount.update.mockResolvedValue({ balance: 13 })
    tx.loyaltyTransaction.create.mockResolvedValue({})
    tx.order.update.mockResolvedValue({})
    ;(mockedPrisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: ReturnType<typeof makeTx>) => unknown) => fn(tx),
    )

    const result = await LoyaltyService.refundOnCancel("ord-1")

    expect(result).toEqual({ refunded: 87, balanceAfter: 13 })
    expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "REFUND",
          points: 87,
          balanceAfter: 13,
          orderId: "ord-1",
        }),
      }),
    )
  })

  it("é idempotente: cancelar 2x só estorna uma vez", async () => {
    const tx = makeTx()
    tx.order.findUnique.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      paymentStatus: "PAGO",
      loyaltyEarned: true,
      loyaltyPoints: 87,
      loyaltyRefunded: true,
    })
    ;(mockedPrisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: ReturnType<typeof makeTx>) => unknown) => fn(tx),
    )

    const result = await LoyaltyService.refundOnCancel("ord-1")

    expect(result).toBeNull()
    expect(tx.loyaltyAccount.update).not.toHaveBeenCalled()
  })

  it("é no-op para pedido não pago", async () => {
    const tx = makeTx()
    tx.order.findUnique.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      paymentStatus: "AGUARDANDO_PAGAMENTO",
      loyaltyEarned: true,
      loyaltyPoints: 87,
      loyaltyRefunded: false,
    })
    ;(mockedPrisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: ReturnType<typeof makeTx>) => unknown) => fn(tx),
    )

    const result = await LoyaltyService.refundOnCancel("ord-1")

    expect(result).toBeNull()
    expect(tx.loyaltyAccount.update).not.toHaveBeenCalled()
  })

  it("clamp em 0 quando saldo é menor que refund", async () => {
    const tx = makeTx()
    tx.order.findUnique.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      paymentStatus: "PAGO",
      loyaltyEarned: true,
      loyaltyPoints: 100,
      loyaltyRefunded: false,
    })
    tx.loyaltyAccount.upsert.mockResolvedValue({ id: "acc-1", balance: 30 })
    tx.loyaltyAccount.findUnique.mockResolvedValue({ balance: 30 })
    tx.loyaltyAccount.update.mockResolvedValue({ balance: 0 })
    tx.loyaltyTransaction.create.mockResolvedValue({})
    tx.order.update.mockResolvedValue({})
    ;(mockedPrisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: ReturnType<typeof makeTx>) => unknown) => fn(tx),
    )

    const result = await LoyaltyService.refundOnCancel("ord-1")

    expect(result).toEqual({ refunded: 30, balanceAfter: 0 })
    expect(tx.loyaltyAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ balance: { decrement: 30 } }),
      }),
    )
  })
})
