import { is99FoodCredentials } from "../accounts"
import type { AccountRecord } from "../types"

const DEFAULT_BASE = "https://openapi.didi-food.com"

function baseUrl(): string {
  return process.env.NINEFOOD_API_BASE || DEFAULT_BASE
}

export async function getNineFoodToken(account: AccountRecord): Promise<string> {
  const creds = account.credentials
  if (!is99FoodCredentials(creds)) throw new Error("Credenciais 99Food inválidas")
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
  return token
}

export function resolveNineFoodOrderUrl(account: AccountRecord, orderUrlOrId: string): string {
  if (orderUrlOrId.includes("://")) return orderUrlOrId
  return `${baseUrl()}/orders/${orderUrlOrId}`
}

export async function fetchNineFoodOrder(account: AccountRecord, orderUrlOrId: string): Promise<any> {
  const token = await getNineFoodToken(account)
  const res = await fetch(resolveNineFoodOrderUrl(account, orderUrlOrId), {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })
  if (!res.ok) throw new Error(`99Food pedido falhou (${res.status})`)
  return res.json()
}

export async function updateNineFoodOrderStatus(account: AccountRecord, orderId: string, operation: string): Promise<void> {
  const token = await getNineFoodToken(account)
  const res = await fetch(`${baseUrl()}/orders/${orderId}/${operation}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })
  if (!res.ok) throw new Error(`99Food atualização de status falhou (${res.status})`)
}
