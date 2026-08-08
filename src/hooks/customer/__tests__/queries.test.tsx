import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  useMe,
  useOrders,
  useLoyaltyBalance,
  useCatalog,
  useDeliverySlots,
} from "@/hooks/customer/queries"

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
  return { Wrapper, qc }
}

const PROFILE = {
  id: "c1",
  name: "Maria",
  email: "maria@ex.com",
  phone: "11999999999",
  hasPassword: true,
}

const ORDERS = [
  { id: "o1", status: "PENDENTE", total: 30, items: [], createdAt: "2026-01-01T00:00:00.000Z" },
]

const LOYALTY = {
  balance: 120,
  lifetimeEarned: 500,
  lifetimeSpent: 380,
  pointsPerReal: 1,
  active: true,
}

function mockFetch(impl: (url: string) => { status: number; body: unknown }) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString()
    const { status, body } = impl(url)
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response
  }) as unknown as typeof fetch
}

function mockLocationHref() {
  const setter = vi.fn()
  let href = "http://localhost/perfil"
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get pathname() {
        return "/perfil"
      },
      get search() {
        return ""
      },
      set href(value: string) {
        href = value
        setter(value)
      },
      get href() {
        return href
      },
    },
  })
  return setter
}

describe("customer queries — tratamento de erro", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe("useMe", () => {
    it("carrega perfil em 200", async () => {
      mockFetch(() => ({ status: 200, body: PROFILE }))
      const { Wrapper } = wrapper()
      const { result } = renderHook(() => useMe(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.data).toEqual(PROFILE)
        expect(result.current.isError).toBe(false)
      })
    })

    it("retorna null em 404 (perfil inexistente)", async () => {
      mockFetch((url) => (url.endsWith("/api/public/auth/me") ? { status: 404, body: { error: "não encontrado" } } : { status: 500, body: {} }))
      const { Wrapper } = wrapper()
      const { result } = renderHook(() => useMe(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.data).toBeNull()
        expect(result.current.isError).toBe(false)
      })
    })

    it("redireciona para /entrar?next= em 401", async () => {
      const setHref = mockLocationHref()
      mockFetch(() => ({ status: 401, body: { error: "Não autenticado" } }))
      const { Wrapper } = wrapper()
      const { result } = renderHook(() => useMe(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
      expect(setHref).toHaveBeenCalledWith("/entrar?next=%2Fperfil")
    })

    it("propaga erro em 5xx", async () => {
      mockFetch(() => ({ status: 500, body: { error: "Erro ao buscar" } }))
      const { Wrapper } = wrapper()
      const { result } = renderHook(() => useMe(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
        expect((result.current.error as Error)?.message).toMatch(/perfil/i)
      })
    })
  })

  describe("useOrders", () => {
    it("carrega lista em 200", async () => {
      mockFetch(() => ({ status: 200, body: ORDERS }))
      const { Wrapper } = wrapper()
      const { result } = renderHook(() => useOrders(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.data).toEqual(ORDERS)
      })
    })

    it("redireciona em 401", async () => {
      const setHref = mockLocationHref()
      mockFetch(() => ({ status: 401, body: { error: "Não autenticado" } }))
      const { Wrapper } = wrapper()
      const { result } = renderHook(() => useOrders(), { wrapper: Wrapper })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(setHref).toHaveBeenCalledWith("/entrar?next=%2Fperfil")
    })

    it("propaga erro em 500", async () => {
      mockFetch(() => ({ status: 500, body: { error: "Erro ao buscar pedidos" } }))
      const { Wrapper } = wrapper()
      const { result } = renderHook(() => useOrders(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
        expect((result.current.error as Error)?.message).toMatch(/pedidos/i)
      })
    })
  })

  describe("useLoyaltyBalance", () => {
    it("carrega snapshot em 200 mesclando defaults", async () => {
      mockFetch(() => ({ status: 200, body: LOYALTY }))
      const { Wrapper } = wrapper()
      const { result } = renderHook(() => useLoyaltyBalance(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.data?.balance).toBe(120)
        expect(result.current.data?.active).toBe(true)
      })
    })

    it("redireciona em 401", async () => {
      const setHref = mockLocationHref()
      mockFetch(() => ({ status: 401, body: { error: "Não autenticado" } }))
      const { Wrapper } = wrapper()
      const { result } = renderHook(() => useLoyaltyBalance(), { wrapper: Wrapper })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(setHref).toHaveBeenCalledWith("/entrar?next=%2Fperfil")
    })

    it("propaga erro em 500", async () => {
      mockFetch(() => ({ status: 500, body: { error: "Erro ao buscar saldo" } }))
      const { Wrapper } = wrapper()
      const { result } = renderHook(() => useLoyaltyBalance(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
        expect((result.current.error as Error)?.message).toMatch(/pontos/i)
      })
    })
  })

  describe("regressão: useCatalog e useDeliverySlots mantêm contrato", () => {
    it("useCatalog redireciona em 401", async () => {
      const setHref = mockLocationHref()
      mockFetch(() => ({ status: 401, body: { error: "Não autenticado" } }))
      const { Wrapper } = wrapper()
      const { result } = renderHook(() => useCatalog(), { wrapper: Wrapper })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(setHref).toHaveBeenCalledWith("/entrar?next=%2Fperfil")
    })

    it("useDeliverySlots redireciona em 401 quando habilitado", async () => {
      const setHref = mockLocationHref()
      mockFetch(() => ({ status: 401, body: { error: "Não autenticado" } }))
      const { Wrapper } = wrapper()
      const { result } = renderHook(() => useDeliverySlots(true), { wrapper: Wrapper })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(setHref).toHaveBeenCalledWith("/entrar?next=%2Fperfil")
    })
  })
})
