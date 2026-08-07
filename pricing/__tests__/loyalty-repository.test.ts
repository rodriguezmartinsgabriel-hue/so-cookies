import { describe, it, expect, vi } from "vitest"

vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: class {},
  LoyaltyAccount: class {},
}))

import { LoyaltyRepository } from "../repositories/LoyaltyRepository"

describe("LoyaltyRepository — blindagem contra falhas de DB", () => {
  it("getBalance retorna { data: 0, degraded: true } quando a tabela LoyaltyAccount não existe (P2021)", async () => {
    const prisma = {
      loyaltyAccount: { findUnique: vi.fn().mockRejectedValue({ code: "P2021", message: "Table not found" }) },
      pricingSettings: { findUnique: vi.fn() },
    } as unknown as ConstructorParameters<typeof LoyaltyRepository>[0]
    const repo = new LoyaltyRepository(prisma)

    const result = await repo.getBalance("cust-1")

    expect(result.data).toBe(0)
    expect(result.degraded).toBe(true)
  })

  it("getBalance retorna { data: 0, degraded: true } quando mensagem contém 'does not exist in the current database'", async () => {
    const prisma = {
      loyaltyAccount: {
        findUnique: vi.fn().mockRejectedValue(
          new Error("Invalid `prisma.loyaltyAccount.findUnique()` invocation: The table `public.LoyaltyAccount` does not exist in the current database."),
        ),
      },
      pricingSettings: { findUnique: vi.fn() },
    } as unknown as ConstructorParameters<typeof LoyaltyRepository>[0]
    const repo = new LoyaltyRepository(prisma)

    const result = await repo.getBalance("cust-1")

    expect(result.data).toBe(0)
    expect(result.degraded).toBe(true)
  })

  it("getBalance retorna { data: 0, degraded: false } em outros erros (não derruba o caller)", async () => {
    const prisma = {
      loyaltyAccount: { findUnique: vi.fn().mockRejectedValue(new Error("connection lost")) },
      pricingSettings: { findUnique: vi.fn() },
    } as unknown as ConstructorParameters<typeof LoyaltyRepository>[0]
    const repo = new LoyaltyRepository(prisma)

    const result = await repo.getBalance("cust-1")

    expect(result.data).toBe(0)
    expect(result.degraded).toBe(false)
  })

  it("getBalance retorna o saldo real em caso de sucesso", async () => {
    const prisma = {
      loyaltyAccount: { findUnique: vi.fn().mockResolvedValue({ balance: 42 }) },
      pricingSettings: { findUnique: vi.fn() },
    } as unknown as ConstructorParameters<typeof LoyaltyRepository>[0]
    const repo = new LoyaltyRepository(prisma)

    const result = await repo.getBalance("cust-1")

    expect(result.data).toBe(42)
    expect(result.degraded).toBe(false)
  })

  it("getSettings retorna DEFAULT_LOYALTY_SETTINGS em caso de erro", async () => {
    const prisma = {
      loyaltyAccount: { findUnique: vi.fn() },
      pricingSettings: { findUnique: vi.fn().mockRejectedValue(new Error("boom")) },
    } as unknown as ConstructorParameters<typeof LoyaltyRepository>[0]
    const repo = new LoyaltyRepository(prisma)

    const settings = await repo.getSettings()

    expect(settings.activateLoyalty).toBe(true)
    expect(settings.pointsPerReal).toBe(1)
    expect(settings.roundingMode).toBe("FLOOR")
  })

  it("getAccountMeta retorna { data: null, degraded: true } quando a tabela LoyaltyAccount não existe", async () => {
    const prisma = {
      loyaltyAccount: { findUnique: vi.fn().mockRejectedValue({ code: "P2021" }) },
      pricingSettings: { findUnique: vi.fn() },
    } as unknown as ConstructorParameters<typeof LoyaltyRepository>[0]
    const repo = new LoyaltyRepository(prisma)

    const result = await repo.getAccountMeta("cust-1")

    expect(result.data).toBeNull()
    expect(result.degraded).toBe(true)
  })

  it("logger.warn é chamado quando getBalance falha", async () => {
    const warn = vi.fn()
    const prisma = {
      loyaltyAccount: { findUnique: vi.fn().mockRejectedValue(new Error("boom")) },
      pricingSettings: { findUnique: vi.fn() },
    } as unknown as ConstructorParameters<typeof LoyaltyRepository>[0]
    const repo = new LoyaltyRepository(prisma, { warn })

    await repo.getBalance("cust-1")

    expect(warn).toHaveBeenCalled()
    const [msg] = warn.mock.calls[0]
    expect(msg).toMatch(/getBalance falhou/)
  })
})
