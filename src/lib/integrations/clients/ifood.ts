import { is99FoodCredentials } from "../accounts"
import type { AccountRecord } from "../types"
import type { PlatformOrderDetails } from "../normalize"

const IFOOD_TOKEN_URL = "https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token"
export const IFOOD_ORDER_BASE = "https://merchant-api.ifood.com.br/order/v1.0"

export async function getIfoodToken(account: AccountRecord): Promise<string> {
  const creds = account.credentials
  if (is99FoodCredentials(creds)) throw new Error("Credenciais iFood inválidas")
  const res = await fetch(IFOOD_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ clientId: creds.clientId, clientSecret: creds.clientSecret, grantType: "client_credentials" }),
  })
  if (!res.ok) throw new Error(`iFood token falhou (${res.status})`)
  const json = await res.json()
  const token = json?.accessToken || json?.access_token
  if (!token) throw new Error("iFood token ausente na resposta")
  return token
}

export async function fetchIfoodOrder(account: AccountRecord, orderId: string): Promise<PlatformOrderDetails> {
  const token = await getIfoodToken(account)
  const res = await fetch(`${IFOOD_ORDER_BASE}/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })
  if (!res.ok) throw new Error(`iFood pedido falhou (${res.status})`)
  return res.json() as Promise<PlatformOrderDetails>
}

export async function updateIfoodOrderStatus(account: AccountRecord, orderId: string, operation: string): Promise<void> {
  const token = await getIfoodToken(account)
  const body = operation === "acknowledgment" ? JSON.stringify({ operation: "ACKNOWLEDGED" }) : null
  const res = await fetch(`${IFOOD_ORDER_BASE}/orders/${orderId}/${operation}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body } : {}),
  })
  if (!res.ok) throw new Error(`iFood atualização de status falhou (${res.status})`)
}
