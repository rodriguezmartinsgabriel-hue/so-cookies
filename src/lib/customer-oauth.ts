import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose"
import { randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"]

const OAUTH_STATE_COOKIE = "socookie_oauth_state"
const OAUTH_STATE_MAX_AGE = 10 * 60

export type OAuthProvider = "google"

export type GoogleProfile = {
  providerAccountId: string
  email: string
  name: string | null
}

type JwtVerifyKey = Parameters<typeof jwtVerify>[1]

export function getGoogleClientId(): string | null {
  const id = process.env.GOOGLE_CLIENT_ID
  return id && id.length > 0 ? id : null
}

export function getGoogleClientSecret(): string | null {
  const secret = process.env.GOOGLE_CLIENT_SECRET
  return secret && secret.length > 0 ? secret : null
}

export function createOAuthState() {
  return {
    state: randomBytes(16).toString("hex"),
    nonce: randomBytes(16).toString("hex"),
  }
}

export type OAuthStatePayload = {
  state: string
  nonce: string
  next?: string
}

export async function setOAuthStateCookie(payload: OAuthStatePayload) {
  const store = await cookies()
  store.set(OAUTH_STATE_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE,
  })
}

export async function getOAuthStateCookie(): Promise<OAuthStatePayload | null> {
  const store = await cookies()
  const raw = store.get(OAUTH_STATE_COOKIE)?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as OAuthStatePayload
  } catch {
    return null
  }
}

export async function clearOAuthStateCookie() {
  const store = await cookies()
  store.delete(OAUTH_STATE_COOKIE)
}

export function sanitizeNext(next: string | null | undefined): string | null {
  if (!next) return null
  if (!next.startsWith("/")) return null
  if (next.startsWith("//")) return null
  return next
}

export function buildGoogleAuthorizeUrl(opts: {
  clientId: string
  redirectUri: string
  state: string
  nonce: string
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: opts.state,
    nonce: opts.nonce,
    prompt: "select_account",
    access_type: "online",
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function exchangeGoogleCode(opts: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}): Promise<{ accessToken: string; idToken: string }> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    redirect_uri: opts.redirectUri,
    grant_type: "authorization_code",
  })
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
  if (!res.ok) {
    throw new Error("google_token_error")
  }
  const data: unknown = await res.json()
  if (
    typeof data !== "object" ||
    data === null ||
    typeof (data as Record<string, unknown>).id_token !== "string" ||
    typeof (data as Record<string, unknown>).access_token !== "string"
  ) {
    throw new Error("google_token_error")
  }
  const { id_token: idToken, access_token: accessToken } = data as { id_token: string; access_token: string }
  return { accessToken, idToken }
}

export async function verifyGoogleIdToken(opts: {
  idToken: string
  clientId: string
  nonce: string
  keys?: JwtVerifyKey
}): Promise<GoogleProfile> {
  const keys = opts.keys ?? createRemoteJWKSet(new URL(GOOGLE_CERTS_URL))
  let payload: JWTPayload
  try {
    const result = await jwtVerify(opts.idToken, keys, {
      issuer: GOOGLE_ISSUERS,
      audience: opts.clientId,
    })
    payload = result.payload
  } catch {
    throw new Error("google_token_invalid")
  }

  if (payload.nonce !== opts.nonce) {
    throw new Error("google_nonce_mismatch")
  }
  if (payload.email_verified !== true) {
    throw new Error("google_email_not_verified")
  }

  const email = typeof payload.email === "string" ? payload.email : ""
  const providerAccountId = typeof payload.sub === "string" ? payload.sub : ""
  if (!email || !providerAccountId) {
    throw new Error("google_profile_missing")
  }

  return {
    providerAccountId,
    email,
    name: typeof payload.name === "string" ? payload.name : null,
  }
}

export function getRequestOrigin(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto")
  const forwardedHost = request.headers.get("x-forwarded-host")
  const host = forwardedHost ?? request.headers.get("host")
  const proto = forwardedProto ?? (request.url.startsWith("https:") ? "https" : "http")
  return host ? `${proto}://${host}` : new URL(request.url).origin
}

export function oauthErrorRedirect(request: Request, code: string): Response {
  const origin = getRequestOrigin(request)
  return new Response(null, {
    status: 302,
    headers: { Location: `${origin}/entrar?oauth_error=${encodeURIComponent(code)}` },
  })
}

export async function findOrCreateOAuthCustomer(opts: {
  provider: OAuthProvider
  providerAccountId: string
  email: string
  name?: string | null
}): Promise<{ customerId: string; created: boolean; linked: boolean }> {
  const { provider, providerAccountId, email } = opts

  const existingAccount = await prisma.customerAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    include: { customer: true },
  })
  if (existingAccount) {
    return { customerId: existingAccount.customer.id, created: false, linked: false }
  }

  const existingByEmail = await prisma.customer.findUnique({ where: { email } })
  if (existingByEmail) {
    await prisma.customerAccount.create({
      data: { provider, providerAccountId, email, customerId: existingByEmail.id },
    })
    return { customerId: existingByEmail.id, created: false, linked: true }
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        name: opts.name?.trim() || email.split("@")[0] || "Cliente",
        email,
        password: null,
      },
    })
    await prisma.customerAccount.create({
      data: { provider, providerAccountId, email, customerId: customer.id },
    })
    return { customerId: customer.id, created: true, linked: false }
  } catch (e) {
    const existingAfterRace = await prisma.customer.findUnique({ where: { email } })
    if (existingAfterRace) {
      await prisma.customerAccount.create({
        data: { provider, providerAccountId, email, customerId: existingAfterRace.id },
      })
      return { customerId: existingAfterRace.id, created: false, linked: true }
    }
    throw e
  }
}
