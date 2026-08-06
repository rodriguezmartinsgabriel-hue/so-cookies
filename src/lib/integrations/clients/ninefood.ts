import { is99FoodCredentials } from "../accounts"
import type { AccountRecord } from "../types"
import type { PlatformOrderDetails } from "../normalize"

const DEFAULT_BASE = "https://openapi.didi-food.com"

function baseUrl(): string {
  return process.env.NINEFOOD_API_BASE || DEFAULT_BASE
}

const DEFAULT_TTL_MS = 50 * 60 * 1000

export async function getNineFoodToken(account: AccountRecord, prisma?: { integrationAccount: { update: (args: { where: { id: string }, data: { cachedToken: string, tokenExpiresAt: Date } }) => Promise<unknown> } }): Promise<string> {
  const creds = account.credentials
  if (!is99FoodCredentials(creds)) throw new Error("Credenciais 99Food inválidas")

  if (account.cachedToken && account.tokenExpiresAt && account.tokenExpiresAt.getTime() > Date.now()) {
    return account.cachedToken
  }

  const clientId = `${creds.appId}_${creds.appShoppId}`
  const res = await fetch(`${baseUrl()}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${creds.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  })
  if (!res.ok) throw new Error(`99Food token falhou (${res.status})`)
  const json = await res.json()
  const token = json?.access_token || json?.accessToken
  if (!token) throw new Error("99Food token ausente na resposta")

  const ttlMs = json?.expires_in ? Math.max(0, json.expires_in * 1000 - 60_000) : DEFAULT_TTL_MS
  const tokenExpiresAt = new Date(Date.now() + ttlMs)

  if (prisma) {
    await prisma.integrationAccount.update({
      where: { id: account.id },
      data: { cachedToken: token, tokenExpiresAt },
    })
  }

  return token
}

export function resolveNineFoodOrderUrl(account: AccountRecord, orderUrlOrId: string): string {
  if (orderUrlOrId.includes("://")) return orderUrlOrId
  return `${baseUrl()}/orders/${orderUrlOrId}`
}

export async function fetchNineFoodOrder(account: AccountRecord, orderUrlOrId: string): Promise<PlatformOrderDetails> {
  const token = await getNineFoodToken(account)
  const res = await fetch(resolveNineFoodOrderUrl(account, orderUrlOrId), {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })
  if (!res.ok) throw new Error(`99Food pedido falhou (${res.status})`)
  return res.json() as Promise<PlatformOrderDetails>
}

export async function updateNineFoodOrderStatus(account: AccountRecord, orderId: string, operation: string): Promise<void> {
  const token = await getNineFoodToken(account)
  const res = await fetch(`${baseUrl()}/orders/${orderId}/${operation}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })
  if (!res.ok) throw new Error(`99Food atualização de status falhou (${res.status})`)
}
