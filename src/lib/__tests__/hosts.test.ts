import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { getHostRole } from "@/lib/hosts"

describe("getHostRole", () => {
  beforeEach(() => {
    delete process.env.STORE_HOST
    delete process.env.STAFF_HOST
    delete process.env.NEXT_PUBLIC_STORE_HOST
    delete process.env.NEXT_PUBLIC_STAFF_HOST
  })

  afterEach(() => {
    delete process.env.STORE_HOST
    delete process.env.STAFF_HOST
    delete process.env.NEXT_PUBLIC_STORE_HOST
    delete process.env.NEXT_PUBLIC_STAFF_HOST
  })

  it("returns unknown when no hosts are configured", () => {
    expect(getHostRole("cookiesecafes.com")).toBe("unknown")
    expect(getHostRole("app.cookiesecafes.com")).toBe("unknown")
    expect(getHostRole("so-cookies-app.vercel.app")).toBe("unknown")
  })

  it("returns unknown for undefined hostname", () => {
    expect(getHostRole(undefined)).toBe("unknown")
  })

  it("returns store for the exact store host", () => {
    process.env.STORE_HOST = "cookiesecafes.com"
    process.env.STAFF_HOST = "app.cookiesecafes.com"
    expect(getHostRole("cookiesecafes.com")).toBe("store")
  })

  it("returns store for www variant of the store host", () => {
    process.env.STORE_HOST = "cookiesecafes.com"
    expect(getHostRole("www.cookiesecafes.com")).toBe("store")
  })

  it("returns staff for the exact staff host", () => {
    process.env.STORE_HOST = "cookiesecafes.com"
    process.env.STAFF_HOST = "app.cookiesecafes.com"
    expect(getHostRole("app.cookiesecafes.com")).toBe("staff")
  })

  it("is case-insensitive", () => {
    process.env.STORE_HOST = "CookiesECafes.com"
    expect(getHostRole("COOKIESECAFES.COM")).toBe("store")
  })

  it("ignores a trailing dot", () => {
    process.env.STORE_HOST = "cookiesecafes.com"
    expect(getHostRole("cookiesecafes.com.")).toBe("store")
  })

  it("returns unknown for hosts that match neither configured domain", () => {
    process.env.STORE_HOST = "cookiesecafes.com"
    process.env.STAFF_HOST = "app.cookiesecafes.com"
    expect(getHostRole("outra-loja.com.br")).toBe("unknown")
    expect(getHostRole("so-cookies-app.vercel.app")).toBe("unknown")
  })

  it("falls back to NEXT_PUBLIC_* env vars", () => {
    process.env.NEXT_PUBLIC_STORE_HOST = "cookiesecafes.com"
    process.env.NEXT_PUBLIC_STAFF_HOST = "app.cookiesecafes.com"
    expect(getHostRole("cookiesecafes.com")).toBe("store")
    expect(getHostRole("app.cookiesecafes.com")).toBe("staff")
  })

  it("does not confuse staff host with store host", () => {
    process.env.STORE_HOST = "cookiesecafes.com"
    process.env.STAFF_HOST = "app.cookiesecafes.com"
    expect(getHostRole("app.cookiesecafes.com")).not.toBe("store")
    expect(getHostRole("cookiesecafes.com")).not.toBe("staff")
  })
})
