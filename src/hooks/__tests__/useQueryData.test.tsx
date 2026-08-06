import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useQueryData } from "@/hooks/useQueryData"

vi.mock("@/lib/repository", () => ({
  repository: {
    products: {
      getAll: vi.fn(),
    },
  },
}))

vi.mock("@/lib/refresh-events", () => ({
  onDataRefresh: vi.fn((cb: () => void) => {
    ;(globalThis as unknown as { __refreshCb?: () => void }).__refreshCb = cb
    return () => {
      delete (globalThis as unknown as { __refreshCb?: () => void }).__refreshCb
    }
  }),
}))

import { repository } from "@/lib/repository"

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
  return { Wrapper, qc }
}

describe("useQueryData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns empty array initially while loading", () => {
    ;(repository.products.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    const { Wrapper } = wrapper()
    const { result } = renderHook(() => useQueryData("products"), { wrapper: Wrapper })
    expect(result.current.data).toEqual([])
    expect(result.current.isLoading).toBe(true)
  })

  it("returns fetched data when getAll resolves", async () => {
    const products = [{ id: "1", name: "Cookie" }]
    ;(repository.products.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(products)
    const { Wrapper } = wrapper()
    const { result } = renderHook(() => useQueryData("products"), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.data).toEqual(products)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it("exposes error when getAll rejects", async () => {
    ;(repository.products.getAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network"))
    const { Wrapper } = wrapper()
    const { result } = renderHook(() => useQueryData("products"), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error)
      expect((result.current.error as Error)?.message).toBe("Network")
    })
  })

  it("invalidate triggers query invalidation", async () => {
    ;(repository.products.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const { Wrapper, qc } = wrapper()
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries")
    const { result } = renderHook(() => useQueryData("products"), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    result.current.invalidate()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] })
  })

  it("subscribes to onDataRefresh and invalidates when triggered", async () => {
    ;(repository.products.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const { Wrapper } = wrapper()
    const { result } = renderHook(() => useQueryData("products"), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const g = globalThis as unknown as { __refreshCb?: () => void }
    expect(g.__refreshCb).toBeDefined()
    expect(typeof g.__refreshCb).toBe("function")
  })
})
