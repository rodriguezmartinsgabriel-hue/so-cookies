import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { usePricing, PRICING_DEBOUNCE_MS } from "@/hooks/usePricing"

vi.mock("@/hooks/useCart", () => ({
  useCart: vi.fn(),
}))

import { useCart } from "@/hooks/useCart"

function mockCart(items: Array<{ productId: string; qty: number }> = []) {
  ;(useCart as ReturnType<typeof vi.fn>).mockReturnValue({ items })
}

function mockFetchSuccess(data: unknown) {
  const spy = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  } as Response)
  global.fetch = spy as unknown as typeof fetch
  return spy
}

function mockFetchFailure(status: number, error: string) {
  const spy = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error }),
  } as Response)
  global.fetch = spy as unknown as typeof fetch
  return spy
}

function mockFetchNetworkError() {
  const spy = vi.fn().mockRejectedValue(new Error("Network error"))
  global.fetch = spy as unknown as typeof fetch
  return spy
}

const samplePricingResult = {
  state: {
    items: [
      {
        productId: "p1",
        name: "Cookie",
        qty: 2,
        basePrice: 10,
        calculatedPrice: 10,
        priceAfterDiscount: 9,
      },
    ],
    blocked: false,
    subtotal: 20,
  },
  total: 20,
  summary: {
    originalPrice: 20,
    subtotal: 20,
    discountTotal: 0,
    cashbackTotal: 0,
    shippingTotal: 0,
    taxTotal: 0,
    total: 20,
    discountPercent: 0,
    rulesApplied: [],
    executionTime: 5,
  },
  auditTrail: { events: [] },
}

describe("usePricing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("returns null result and not loading when cart is empty", () => {
    mockCart([])
    const { result } = renderHook(() => usePricing())
    expect(result.current.result).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it("sends POST to /api/public/pricing when cart has items", async () => {
    mockCart([{ productId: "p1", qty: 2 }])
    const fetchSpy = mockFetchSuccess(samplePricingResult)

    const { result } = renderHook(() => usePricing())

    await waitFor(
      () => {
        expect(result.current.result).toEqual(samplePricingResult)
      },
      { timeout: 2000 },
    )
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, opts] = (fetchSpy as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe("/api/public/pricing")
    expect(opts.method).toBe("POST")
    expect(JSON.parse(opts.body)).toEqual({ items: [{ productId: "p1", qty: 2 }], channel: "pickup" })
  })

  it("loads and exposes pricing result on success", async () => {
    mockCart([{ productId: "p1", qty: 2 }])
    mockFetchSuccess(samplePricingResult)

    const { result } = renderHook(() => usePricing())

    await waitFor(() => {
      expect(result.current.result).toEqual(samplePricingResult)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  it("sets error message when fetch fails with non-ok status", async () => {
    mockCart([{ productId: "p1", qty: 1 }])
    mockFetchFailure(400, "Invalid items")

    const { result } = renderHook(() => usePricing())

    await waitFor(() => {
      expect(result.current.error).toBe("Invalid items")
      expect(result.current.loading).toBe(false)
      expect(result.current.result).toBeNull()
    })
  })

  it("falls back to default error message when response has no error field", async () => {
    mockCart([{ productId: "p1", qty: 1 }])
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response)

    const { result } = renderHook(() => usePricing())

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to calculate price")
    })
  })

  it("sets error message on network failure", async () => {
    mockCart([{ productId: "p1", qty: 1 }])
    mockFetchNetworkError()

    const { result } = renderHook(() => usePricing())

    await waitFor(() => {
      expect(result.current.error).toBe("Network error")
      expect(result.current.loading).toBe(false)
    })
  })

  it("does not refetch when cart key is unchanged on rerender", async () => {
    mockCart([{ productId: "p1", qty: 1 }])
    const fetchSpy = mockFetchSuccess(samplePricingResult)

    const { result, rerender } = renderHook(() => usePricing())
    await waitFor(
      () => {
        expect(result.current.result).toEqual(samplePricingResult)
      },
      { timeout: 2000 },
    )
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    rerender()
    await new Promise((r) => setTimeout(r, 50))
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("formats BRL values properly", () => {
    mockCart([])
    const { result } = renderHook(() => usePricing())
    expect(result.current.formatBRL(20)).toMatch(/R\$/)
  })

  it("includes couponCode and channel in the pricing request", async () => {
    mockCart([{ productId: "p1", qty: 2 }])
    const fetchSpy = mockFetchSuccess(samplePricingResult)

    const { result } = renderHook(() => usePricing({ couponCode: "WELCOME10", channel: "delivery" }))

    await waitFor(
      () => {
        expect(result.current.result).toEqual(samplePricingResult)
      },
      { timeout: 2000 },
    )
    const [url, opts] = (fetchSpy as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe("/api/public/pricing")
    expect(JSON.parse(opts.body)).toEqual({
      items: [{ productId: "p1", qty: 2 }],
      channel: "delivery",
      couponCode: "WELCOME10",
    })
  })

  it("refetches when couponCode changes", async () => {
    mockCart([{ productId: "p1", qty: 1 }])
    const fetchSpy = mockFetchSuccess(samplePricingResult)

    const { result, rerender } = renderHook(
      ({ couponCode }: { couponCode: string | null }) => usePricing({ couponCode }),
      { initialProps: { couponCode: null } as { couponCode: string | null } },
    )
    await waitFor(
      () => {
        expect(result.current.result).toEqual(samplePricingResult)
      },
      { timeout: 2000 },
    )
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    rerender({ couponCode: "FIX10" })
    await waitFor(
      () => {
        expect(fetchSpy).toHaveBeenCalledTimes(2)
      },
      { timeout: 2000 },
    )
  })

  it("coalesces rapid quantity changes via debounce (PRICING_DEBOUNCE_MS)", async () => {
    mockCart([{ productId: "p1", qty: 1 }])
    const fetchSpy = mockFetchSuccess(samplePricingResult)

    const { result, rerender } = renderHook(
      ({ qty }: { qty: number }) => {
        ;(useCart as ReturnType<typeof vi.fn>).mockReturnValue({ items: [{ productId: "p1", qty }] })
        return usePricing()
      },
      { initialProps: { qty: 1 } },
    )

    await waitFor(
      () => {
        expect(result.current.result).toEqual(samplePricingResult)
      },
      { timeout: 2000 },
    )
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Mudanças rápidas (antes do debounce expirar) devem coalescer em um único fetch.
    rerender({ qty: 2 })
    rerender({ qty: 3 })
    rerender({ qty: 4 })

    await waitFor(
      () => {
        expect(fetchSpy).toHaveBeenCalledTimes(2)
      },
      { timeout: 2000 },
    )
    const [, opts] = (fetchSpy as ReturnType<typeof vi.fn>).mock.calls[1]
    expect(JSON.parse(opts.body).items).toEqual([{ productId: "p1", qty: 4 }])
  })

  it("exposes PRICING_DEBOUNCE_MS as a small (<100ms) constant for instant feel", () => {
    expect(PRICING_DEBOUNCE_MS).toBeLessThanOrEqual(100)
  })

  it("applies an optimistic preview based on available tiers from the previous result", async () => {
    const tiersResult = {
      ...samplePricingResult,
      state: {
        ...samplePricingResult.state,
        availableTiers: {
          p1: [
            { id: "t1", productId: "p1", name: "Leve 3", minQty: 3, maxQty: 9, price: 9 },
            { id: "t2", productId: "p1", name: "Leve 10", minQty: 10, maxQty: null, price: 8 },
          ],
        },
      },
    }

    // Estado inicial: qty=1.
    mockCart([{ productId: "p1", qty: 1 }])
    mockFetchSuccess(tiersResult)

    const { result, rerender } = renderHook(
      ({ qty }: { qty: number }) => {
        ;(useCart as ReturnType<typeof vi.fn>).mockReturnValue({ items: [{ productId: "p1", qty }] })
        return usePricing()
      },
      { initialProps: { qty: 1 } },
    )

    // Aguarda o primeiro fetch terminar — popula lastResultRef com availableTiers.
    await waitFor(() => {
      expect(result.current.result?.state.availableTiers).toBeDefined()
    })

    // Bloqueia novos fetches (fetch pendurado infinito).
    let resolvePending: ((v: unknown) => void) | null = null
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePending = resolve
        }),
    ) as unknown as typeof fetch

    // Muda para qty=3. Após o debounce, o optimistic preview deve aplicar
    // o tier "Leve 3" (price 9) imediatamente, mesmo com o fetch em voo.
    rerender({ qty: 3 })

    await waitFor(() => {
      const items = result.current.result?.state.items ?? []
      const item = items.find((it) => it.productId === "p1")
      expect(item?.priceAfterDiscount).toBe(9)
    })

    // Cleanup: resolve o fetch pendurado se ele tiver sido iniciado.
    await act(async () => {
      if (resolvePending) {
        resolvePending({ ok: true, json: async () => tiersResult })
      }
      await Promise.resolve()
    })
  })
})
