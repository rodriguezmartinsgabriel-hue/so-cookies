// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { existsSync } from "node:fs"
import path from "node:path"
import { middleware, config } from "./middleware"

function req(url: string): NextRequest {
  return new NextRequest(url)
}

describe("middleware.ts integration", () => {
  it("middleware.ts file exists at project root", () => {
    const middlewarePath = path.resolve(__dirname, "middleware.ts")
    expect(existsSync(middlewarePath)).toBe(true)
  })

  it("exports a middleware function and config", () => {
    expect(typeof middleware).toBe("function")
    expect(config).toBeDefined()
    expect(Array.isArray(config.matcher)).toBe(true)
    expect(config.matcher.length).toBeGreaterThan(0)
  })

  it("matcher excludes static assets so infra routes pass through", () => {
    const pattern = config.matcher[0]
    expect(pattern).toContain("_next/static")
    expect(pattern).toContain("_next/image")
    expect(pattern).toContain("favicon.ico")
  })
})

describe("middleware runtime — host routing via next.js middleware wrapper", () => {
  beforeEach(() => {
    process.env.STORE_HOST = "cookiesecafes.com"
    process.env.STAFF_HOST = "app.cookiesecafes.com"
  })

  afterEach(() => {
    delete process.env.STORE_HOST
    delete process.env.STAFF_HOST
  })

  it("redirects / to /cardapio on the store host (smoke test for cookiesecafes.com)", () => {
    const res = middleware(req("https://cookiesecafes.com/"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("https://cookiesecafes.com/cardapio")
  })

  it("redirects / to /login on the staff host when no session (app.cookiesecafes.com)", () => {
    const res = middleware(req("https://app.cookiesecafes.com/"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("https://app.cookiesecafes.com/login")
  })

  it("returns 404 for staff route /login on the store host", () => {
    expect(middleware(req("https://cookiesecafes.com/login")).status).toBe(404)
  })

  it("returns 404 for customer route /cardapio on the staff host", () => {
    expect(middleware(req("https://app.cookiesecafes.com/cardapio")).status).toBe(404)
  })

  it("returns 404 for staff api /api/dashboard/kpis on the store host", () => {
    expect(middleware(req("https://cookiesecafes.com/api/dashboard/kpis")).status).toBe(404)
  })

  it("returns 404 for customer api /api/public/catalog on the staff host", () => {
    expect(middleware(req("https://app.cookiesecafes.com/api/public/catalog")).status).toBe(404)
  })

  it("allows /entrar on store host without login (public customer auth route)", () => {
    expect(middleware(req("https://cookiesecafes.com/entrar")).status).toBe(200)
  })

  it("redirects /cardapio to /entrar?next=/cardapio on the store host without customer cookie", () => {
    const res = middleware(req("https://cookiesecafes.com/cardapio"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("https://cookiesecafes.com/entrar?next=%2Fcardapio")
  })

  it("allows /cardapio on store host with customer cookie", () => {
    const request = new NextRequest("https://cookiesecafes.com/cardapio", {
      headers: { cookie: "socookie_customer=token" },
    })
    expect(middleware(request).status).toBe(200)
  })

  it("allows /login on staff host (staff auth route)", () => {
    expect(middleware(req("https://app.cookiesecafes.com/login")).status).toBe(200)
  })

  it("distinguishes /pedido (customer) from /pedidos (staff) on store host", () => {
    expect(middleware(req("https://cookiesecafes.com/pedido/abc")).status).toBe(307)
    expect(middleware(req("https://cookiesecafes.com/pedidos")).status).toBe(404)
  })
})
