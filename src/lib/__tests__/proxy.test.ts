// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { proxy } from "@/proxy"

function req(url: string): NextRequest {
  return new NextRequest(url)
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

  it("allows customer routes on the store host", () => {
    for (const p of ["/entrar", "/cadastro", "/cardapio", "/carrinho", "/perfil", "/pedido/abc"]) {
      expect(proxy(req(`http://store.example.com${p}`)).status, p).toBe(200)
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
    for (const p of ["/entrar", "/cadastro", "/cardapio", "/perfil", "/api/public/catalog", "/api/public/auth/oauth/google", "/api/public/auth/oauth/google/callback"]) {
      expect(proxy(req(`http://app.example.com${p}`)).status, p).toBe(404)
    }
  })

  it("distinguishes /pedido (cliente) from /pedidos (gestão)", () => {
    expect(proxy(req("http://store.example.com/pedido/abc")).status).toBe(200)
    expect(proxy(req("http://store.example.com/pedidos")).status).toBe(404)
    expect(proxy(req("http://app.example.com/pedido/abc")).status).toBe(404)
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
