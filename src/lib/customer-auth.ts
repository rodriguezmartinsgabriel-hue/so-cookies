import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { prisma } from "./prisma"

const COOKIE_NAME = "socookie_customer"
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export const customerSafeSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  addressCep: true,
  addressStreet: true,
  addressNumber: true,
  addressComplement: true,
  addressNeighborhood: true,
  addressCity: true,
  addressState: true,
  createdAt: true,
} as const

function getSecret(): Uint8Array {
  const secret = process.env.CUSTOMER_AUTH_SECRET || process.env.NEXTAUTH_SECRET || "so-cookies-customer-dev-secret"
  return new TextEncoder().encode(secret)
}

export async function signCustomerToken(customerId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(customerId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret())
}

export async function verifyCustomerToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return typeof payload.sub === "string" ? payload.sub : null
  } catch {
    return null
  }
}

export async function setCustomerCookie(customerId: string) {
  const token = await signCustomerToken(customerId)
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  })
}

export async function clearCustomerCookie() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function getCustomerSession() {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  const customerId = await verifyCustomerToken(token)
  if (!customerId) return null
  return prisma.customer.findUnique({ where: { id: customerId }, select: customerSafeSelect })
}

export async function requireCustomer() {
  const customer = await getCustomerSession()
  if (!customer) {
    return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }), customer: null }
  }
  return { error: null, customer }
}
