// @vitest-environment node
import { describe, it, expect, beforeEach, vi, afterEach, beforeAll } from "vitest"
import { SignJWT } from "jose"

const store = vi.hoisted(() => {
  const customers = new Map<string, Record<string, unknown>>()
  const accounts = new Map<string, Record<string, unknown>>()
  let id = 0

  function reset() {
    customers.clear()
    accounts.clear()
    id = 0
  }

  const mockPrisma = {
    customer: {
      findUnique: async ({ where }: { where?: Record<string, unknown> }) => {
        if (where?.email) {
          return [...customers.values()].find((c) => c.email === where.email) ?? null
        }
        if (where?.id) return customers.get(where.id as string) ?? null
        return null
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const customer = { id: `c-${++id}`, createdAt: new Date(), updatedAt: new Date(), ...data }
        customers.set(customer.id as string, customer)
        return customer
      },
    },
    customerAccount: {
      findUnique: async ({ where, include }: { where?: Record<string, unknown>; include?: { customer?: boolean } }) => {
        const key = where?.provider_providerAccountId as { provider?: string; providerAccountId?: string } | undefined
        const acc = [...accounts.values()].find(
          (a) => a.provider === key?.provider && a.providerAccountId === key?.providerAccountId,
        )
        if (!acc) return null
        if (include?.customer) return { ...acc, customer: customers.get(acc.customerId as string) }
        return acc
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const acc = { id: `a-${++id}`, createdAt: new Date(), ...data }
        accounts.set(acc.id as string, acc)
        return acc
      },
    },
  }

  return { mockPrisma, customers, accounts, reset }
})

vi.mock("@/lib/prisma", () => ({ prisma: store.mockPrisma }))

import {
  buildGoogleAuthorizeUrl,
  createOAuthState,
  exchangeGoogleCode,
  findOrCreateOAuthCustomer,
  oauthErrorRedirect,
  sanitizeNext,
  signOAuthState,
  verifyGoogleIdToken,
  verifyOAuthState,
} from "@/lib/customer-oauth"

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = "test-secret"
})

const secret = new TextEncoder().encode("test-secret")

async function signGoogleToken(
  opts: {
    sub?: string
    email?: string
    name?: string
    emailVerified?: boolean
    nonce?: string
    issuer?: string
    audience?: string
  } = {},
) {
  return new SignJWT({
    email: opts.email ?? "cliente@example.com",
    name: opts.name ?? "Cliente Teste",
    email_verified: opts.emailVerified ?? true,
    nonce: opts.nonce ?? "correct-nonce",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(opts.sub ?? "google-sub-123")
    .setIssuer(opts.issuer ?? "https://accounts.google.com")
    .setAudience(opts.audience ?? "client-id")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret)
}

describe("sanitizeNext", () => {
  it("keeps relative paths", () => {
    expect(sanitizeNext("/perfil")).toBe("/perfil")
    expect(sanitizeNext("/pedido/abc")).toBe("/pedido/abc")
  })

  it("rejects external and protocol-relative URLs", () => {
    expect(sanitizeNext("https://evil.com")).toBeNull()
    expect(sanitizeNext("//evil.com")).toBeNull()
  })

  it("rejects empty values", () => {
    expect(sanitizeNext("")).toBeNull()
    expect(sanitizeNext(null)).toBeNull()
    expect(sanitizeNext(undefined)).toBeNull()
  })
})

describe("buildGoogleAuthorizeUrl", () => {
  it("builds the authorize URL with all params", () => {
    const url = new URL(
      buildGoogleAuthorizeUrl({
        clientId: "cid",
        redirectUri: "https://cookiesecafes.com/api/public/auth/oauth/google/callback",
        state: "s",
        nonce: "n",
      }),
    )
    expect(url.origin).toBe("https://accounts.google.com")
    expect(url.pathname).toBe("/o/oauth2/v2/auth")
    expect(url.searchParams.get("client_id")).toBe("cid")
    expect(url.searchParams.get("redirect_uri")).toBe("https://cookiesecafes.com/api/public/auth/oauth/google/callback")
    expect(url.searchParams.get("response_type")).toBe("code")
    expect(url.searchParams.get("scope")).toBe("openid email profile")
    expect(url.searchParams.get("state")).toBe("s")
    expect(url.searchParams.get("nonce")).toBe("n")
    expect(url.searchParams.get("prompt")).toBe("select_account")
  })
})

describe("exchangeGoogleCode", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("exchanges the code for tokens", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "at", id_token: "idt" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await exchangeGoogleCode({
      code: "code",
      clientId: "cid",
      clientSecret: "cs",
      redirectUri: "https://cookiesecafes.com/api/public/auth/oauth/google/callback",
    })
    expect(result).toEqual({ accessToken: "at", idToken: "idt" })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://oauth2.googleapis.com/token")
    expect(init.method).toBe("POST")
    const body = new URLSearchParams(init.body as string)
    expect(body.get("code")).toBe("code")
    expect(body.get("grant_type")).toBe("authorization_code")
  })

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    await expect(exchangeGoogleCode({ code: "x", clientId: "c", clientSecret: "s", redirectUri: "r" })).rejects.toThrow(
      "google_token_error",
    )
  })

  it("throws when tokens are missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ foo: "bar" }) }))
    await expect(exchangeGoogleCode({ code: "x", clientId: "c", clientSecret: "s", redirectUri: "r" })).rejects.toThrow(
      "google_token_error",
    )
  })
})

describe("verifyGoogleIdToken", () => {
  it("accepts a valid token", async () => {
    const token = await signGoogleToken()
    const profile = await verifyGoogleIdToken({
      idToken: token,
      clientId: "client-id",
      nonce: "correct-nonce",
      keys: secret,
    })
    expect(profile).toEqual({
      providerAccountId: "google-sub-123",
      email: "cliente@example.com",
      name: "Cliente Teste",
    })
  })

  it("rejects a mismatched nonce", async () => {
    const token = await signGoogleToken()
    await expect(
      verifyGoogleIdToken({ idToken: token, clientId: "client-id", nonce: "wrong-nonce", keys: secret }),
    ).rejects.toThrow("google_nonce_mismatch")
  })

  it("rejects an unverified email", async () => {
    const token = await signGoogleToken({ emailVerified: false })
    await expect(
      verifyGoogleIdToken({ idToken: token, clientId: "client-id", nonce: "correct-nonce", keys: secret }),
    ).rejects.toThrow("google_email_not_verified")
  })

  it("rejects a token for a different audience", async () => {
    const token = await signGoogleToken({ audience: "other-client" })
    await expect(
      verifyGoogleIdToken({ idToken: token, clientId: "client-id", nonce: "correct-nonce", keys: secret }),
    ).rejects.toThrow("google_token_invalid")
  })

  it("rejects a malformed token", async () => {
    await expect(
      verifyGoogleIdToken({ idToken: "not-a-jwt", clientId: "client-id", nonce: "correct-nonce", keys: secret }),
    ).rejects.toThrow("google_token_invalid")
  })

  it("rejects a token without email/sub", async () => {
    const token = await new SignJWT({ email_verified: true, nonce: "correct-nonce" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("https://accounts.google.com")
      .setAudience("client-id")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(secret)
    await expect(
      verifyGoogleIdToken({ idToken: token, clientId: "client-id", nonce: "correct-nonce", keys: secret }),
    ).rejects.toThrow("google_profile_missing")
  })
})

describe("findOrCreateOAuthCustomer", () => {
  beforeEach(() => {
    store.reset()
  })

  it("creates a new customer without password", async () => {
    const result = await findOrCreateOAuthCustomer({
      provider: "google",
      providerAccountId: "sub-1",
      email: "novo@example.com",
      name: "Novo Cliente",
    })
    expect(result.created).toBe(true)
    expect(result.linked).toBe(false)
    expect(result.customerId).toBeTruthy()

    const customer = [...store.customers.values()].find((c) => c.email === "novo@example.com")
    expect(customer?.password).toBeNull()
    expect(customer?.name).toBe("Novo Cliente")
  })

  it("links to an existing customer by verified email", async () => {
    await store.mockPrisma.customer.create({
      data: { name: "Antigo", email: "ja@example.com", password: "hash", phone: null },
    })

    const result = await findOrCreateOAuthCustomer({
      provider: "google",
      providerAccountId: "sub-2",
      email: "ja@example.com",
      name: "Antigo",
    })
    expect(result.created).toBe(false)
    expect(result.linked).toBe(true)

    expect(store.customers.size).toBe(1)
    const account = [...store.accounts.values()].find((a) => a.providerAccountId === "sub-2")
    expect(account?.customerId).toBe(result.customerId)
  })

  it("returns the same customer when the provider account already exists", async () => {
    await findOrCreateOAuthCustomer({
      provider: "google",
      providerAccountId: "sub-3",
      email: "mesmo@example.com",
    })

    const result = await findOrCreateOAuthCustomer({
      provider: "google",
      providerAccountId: "sub-3",
      email: "mesmo@example.com",
      name: "Outro Nome",
    })
    expect(result.created).toBe(false)
    expect(result.linked).toBe(false)
    expect(store.customers.size).toBe(1)
    expect([...store.customers.values()][0]?.email).toBe("mesmo@example.com")
  })

  it("uses the email local part as fallback name", async () => {
    const result = await findOrCreateOAuthCustomer({
      provider: "google",
      providerAccountId: "sub-4",
      email: "sem.nome@example.com",
    })
    const customer = [...store.customers.values()].find((c) => c.id === result.customerId)
    expect(customer?.name).toBe("sem.nome")
  })
})

describe("signOAuthState / verifyOAuthState", () => {
  it("round-trips nonce and next", async () => {
    const state = await signOAuthState({ nonce: "n1", next: "/perfil" })
    const payload = await verifyOAuthState(state)
    expect(payload).toEqual({ nonce: "n1", next: "/perfil" })
  })

  it("round-trips without next", async () => {
    const state = await signOAuthState({ nonce: "n2" })
    const payload = await verifyOAuthState(state)
    expect(payload).toEqual({ nonce: "n2", next: undefined })
  })

  it("creates a fresh nonce per state", async () => {
    const a = createOAuthState()
    const b = createOAuthState()
    expect(a.nonce).toBeTruthy()
    expect(a.nonce).not.toBe(b.nonce)
  })

  it("returns null for a tampered token", async () => {
    const state = await signOAuthState({ nonce: "n3" })
    const tampered = state.slice(0, -2) + (state.endsWith("a") ? "b" : "a")
    await expect(verifyOAuthState(tampered)).resolves.toBeNull()
  })

  it("returns null for a token signed with a different secret", async () => {
    process.env.NEXTAUTH_SECRET = "other-secret"
    try {
      const state = await signOAuthState({ nonce: "n4" })
      process.env.NEXTAUTH_SECRET = "test-secret"
      await expect(verifyOAuthState(state)).resolves.toBeNull()
    } finally {
      process.env.NEXTAUTH_SECRET = "test-secret"
    }
  })

  it("returns null for a malformed token", async () => {
    await expect(verifyOAuthState("not-a-jwt")).resolves.toBeNull()
  })

  it("returns null for an expired token", async () => {
    vi.useFakeTimers()
    try {
      const state = await signOAuthState({ nonce: "n5" })
      vi.advanceTimersByTime(11 * 60 * 1000)
      await expect(verifyOAuthState(state)).resolves.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe("oauthErrorRedirect", () => {
  it("redirects to /entrar with the error code", () => {
    const request = new Request("https://cookiesecafes.com/api/public/auth/oauth/google/callback")
    const res = oauthErrorRedirect(request, "invalid_state")
    expect(res.status).toBe(302)
    expect(res.headers.get("Location")).toBe("https://cookiesecafes.com/entrar?oauth_error=invalid_state")
  })
})
