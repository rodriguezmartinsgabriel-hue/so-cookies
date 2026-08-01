export const PLATFORMS = ["99FOOD", "IFOOD"] as const
export type Platform = (typeof PLATFORMS)[number]

export type AccountCredentials99Food = {
  appId: string
  appShoppId: string
  clientSecret: string
}

export type AccountCredentialsIfood = {
  clientId: string
  clientSecret: string
}

export type AccountCredentials = AccountCredentials99Food | AccountCredentialsIfood

export type AccountRecord = {
  id: string
  platform: Platform
  storeName: string | null
  enabled: boolean
  credentials: AccountCredentials
  lastSyncAt: string | null
  lastError: string | null
}

export type NormalizedOrderItem = {
  name: string
  qty: number
  price: number
  notes?: string
}

export type NormalizedOrder = {
  externalId: string
  channel: string
  customer: string
  total: number
  notes?: string
  deliveryAddress?: string
  customerPhone?: string
  platformFee: number
  items: NormalizedOrderItem[]
}

export type InboundOrderEvent = {
  eventId: string
  eventType: string
  orderId: string
  orderUrl?: string
  createdAt?: string
}

export const MARKETPLACE_SLA_MINUTES = 8
