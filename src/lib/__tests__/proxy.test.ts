// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { proxy } from "@/lib/proxy"

function req(url: string): NextRequest {
  return new NextRequest(url)
}

function reqWithCookie(url: string, cookie: string): NextRequest {
  return new NextRequest(url, { headers: { cookie } })
}

describe("proxy host isolation (loja vs manager)", () => {
  beforeEach(() => {
    process.env.STORE_HOST = "store.example.com"
    process.env.STAFF_HOST = "app.example.com"
    delete process.env.NEXT_PUBLIC_STORE_HOST
    delete process.env.NEXT_PUBLIC_STAFF_HOST
  })

  afterEach(() => {
    delete process.env.STORE_HOST
    delete process.env.STAFF_HOST
  })

  it("redirects / to /cardapio on the store host", () => {
    const res = proxy(req("http://store.example.com/"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://store.example.com/cardapio")
  })

  it("allows auth customer routes on the store host without login", () => {
    for (const p of ["/entrar", "/cadastro"]) {
      expect(proxy(req(`http://store.example.com${p}`)).status, p).toBe(200)
    }
  })

  it("redirects protected customer routes to /entrar?next=... without login", () => {
    for (const p of ["/cardapio", "/carrinho", "/perfil", "/pedido/abc", "/pagamento/abc"]) {
      const res = proxy(req(`http://store.example.com${p}`))
      expect(res.status, p).toBe(307)
      expect(res.headers.get("location"), p).toBe(`http://store.example.com/entrar?next=${encodeURIComponent(p)}`)
    }
  })

  it("allows protected customer routes on the store host with a customer cookie", () => {
    for (const p of ["/cardapio", "/carrinho", "/perfil", "/pedido/abc", "/pagamento/abc"]) {
      expect(proxy(reqWithCookie(`http://store.example.com${p}`, "socookie_customer=token")).status, p).toBe(200)
    }
  })

  it("allows the new /api/public oauth routes on the store host", () => {
    for (const p of ["/api/public/auth/oauth/google", "/api/public/auth/oauth/google/callback"]) {
      expect(proxy(req(`http://store.example.com${p}`)).status, p).toBe(200)
    }
  })

  it("returns 404 for staff pages and APIs on the store host", () => {
    for (const p of ["/pedidos", "/dashboard", "/estoque", "/api/orders", "/api/products", "/login"]) {
      expect(proxy(req(`http://store.example.com${p}`)).status, p).toBe(404)
    }
  })

  it("returns 404 for customer routes/APIs on the staff host", () => {
    for (const p of [
      "/entrar",
      "/cadastro",
      "/cardapio",
      "/perfil",
      "/pagamento/abc",
      "/api/public/catalog",
      "/api/public/auth/oauth/google",
      "/api/public/auth/oauth/google/callback",
    ]) {
      expect(proxy(req(`http://app.example.com${p}`)).status, p).toBe(404)
    }
  })

  it("distinguishes /pedido (cliente) from /pedidos (gestão)", () => {
    expect(proxy(req("http://store.example.com/pedido/abc")).status).toBe(307)
    expect(proxy(req("http://store.example.com/pedidos")).status).toBe(404)
    expect(proxy(reqWithCookie("http://store.example.com/pedido/abc", "socookie_customer=token")).status).toBe(200)
    expect(proxy(req("http://app.example.com/pedido/abc")).status).toBe(404)
  })

  it("allows the Mercado Pago webhook without customer login on both hosts", () => {
    const path = "/api/payments/webhook/mercadopago?type=payment&data.id=123"
    expect(proxy(req(`http://store.example.com${path}`)).status).toBe(200)
    expect(proxy(req(`http://app.example.com${path}`)).status).toBe(200)
  })

  it("exposes /api/health on the store host for diagnostics", () => {
    expect(proxy(req("http://store.example.com/api/health")).status).toBe(200)
    expect(proxy(req("http://store.example.com/api/health/")).status).toBe(200)
  })

  it("protects staff pages on the staff host without a session", () => {
    const res = proxy(req("http://app.example.com/pedidos"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://app.example.com/login")
  })

  it("allows staff login and auth routes on the staff host", () => {
    expect(proxy(req("http://app.example.com/login")).status).toBe(200)
    expect(proxy(req("http://app.example.com/api/auth/callback/credentials")).status).toBe(200)
  })
})
