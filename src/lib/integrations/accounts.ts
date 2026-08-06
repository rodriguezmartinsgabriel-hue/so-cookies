import { prisma } from "@/lib/prisma"
import { decryptCredentials, encryptCredentials } from "./crypto"
import { verifyHmacSha256 } from "./signature"
import type { AccountCredentials, AccountCredentials99Food, AccountRecord, Platform } from "./types"

export function is99FoodCredentials(creds: AccountCredentials): creds is AccountCredentials99Food {
  return "appShoppId" in creds
}

function toAccountRecord(row: {
  id: string
  platform: string
  storeName: string | null
  enabled: boolean
  credentials: string
  cachedToken: string | null
  tokenExpiresAt: Date | null
  lastSyncAt: Date | null
  lastError: string | null
}): AccountRecord {
  return {
    id: row.id,
    platform: row.platform as Platform,
    storeName: row.storeName,
    enabled: row.enabled,
    credentials: decryptCredentials<AccountCredentials>(row.credentials),
    cachedToken: row.cachedToken,
    tokenExpiresAt: row.tokenExpiresAt,
    lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
    lastError: row.lastError,
  }
}

export async function getEnabledAccounts(platform: Platform): Promise<AccountRecord[]> {
  const rows = await prisma.integrationAccount.findMany({ where: { platform, enabled: true } })
  return rows.map(toAccountRecord)
}

export async function getAllEnabledAccounts(): Promise<AccountRecord[]> {
  const rows = await prisma.integrationAccount.findMany({ where: { enabled: true } })
  return rows.map(toAccountRecord)
}

export async function find99FoodAccountByMerchant(merchantId: string): Promise<AccountRecord | null> {
  const accounts = await getEnabledAccounts("99FOOD")
  return accounts.find((a) => is99FoodCredentials(a.credentials) && a.credentials.appShoppId === merchantId) || null
}

export async function findIfoodAccountBySignature(
  rawBody: string,
  signature: string | null,
): Promise<AccountRecord | null> {
  if (!signature) return null
  const accounts = await getEnabledAccounts("IFOOD")
  return (
    accounts.find(
      (a) => !is99FoodCredentials(a.credentials) && verifyHmacSha256(rawBody, a.credentials.clientSecret, signature),
    ) || null
  )
}

export async function saveAccount(input: {
  platform: Platform
  storeName?: string | null
  credentials: AccountCredentials
  enabled?: boolean
}): Promise<{ id: string }> {
  const storeName = input.storeName ?? null
  const existing = await prisma.integrationAccount.findFirst({ where: { platform: input.platform, storeName } })
  const credentials = encryptCredentials(input.credentials)
  if (existing) {
    return prisma.integrationAccount.update({
      where: { id: existing.id },
      data: { credentials, enabled: input.enabled ?? true },
      select: { id: true },
    })
  }
  return prisma.integrationAccount.create({
    data: { platform: input.platform, storeName, credentials, enabled: input.enabled ?? true },
    select: { id: true },
  })
}

export type AccountView = {
  id: string
  platform: Platform
  storeName: string | null
  enabled: boolean
  lastSyncAt: string | null
  lastError: string | null
  createdAt: string
  credentials: { appId?: string; appShoppId?: string; clientId?: string }
}

export function webhookUrlFor(platform: Platform, origin: string): string {
  const base = `${origin}/api/integrations`
  return platform === "99FOOD" ? `${base}/99food/webhook` : `${base}/ifood/webhook`
}

export async function listAccountsForAdmin(): Promise<AccountView[]> {
  const rows = await prisma.integrationAccount.findMany({ orderBy: { createdAt: "desc" } })
  return rows.map((row) => {
    const creds = decryptCredentials<AccountCredentials>(row.credentials)
    const safe: AccountView["credentials"] = is99FoodCredentials(creds)
      ? { appId: creds.appId, appShoppId: creds.appShoppId }
      : { clientId: creds.clientId }
    return {
      id: row.id,
      platform: row.platform as Platform,
      storeName: row.storeName,
      enabled: row.enabled,
      lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
      lastError: row.lastError,
      createdAt: row.createdAt.toISOString(),
      credentials: safe,
    }
  })
}

export async function createAccount(input: {
  platform: Platform
  storeName: string
  credentials: AccountCredentials
  enabled?: boolean
}): Promise<AccountView> {
  const row = await prisma.integrationAccount.create({
    data: {
      platform: input.platform,
      storeName: input.storeName,
      credentials: encryptCredentials(input.credentials),
      enabled: input.enabled ?? true,
    },
  })
  const creds = decryptCredentials<AccountCredentials>(row.credentials)
  const safe: AccountView["credentials"] = is99FoodCredentials(creds)
    ? { appId: creds.appId, appShoppId: creds.appShoppId }
    : { clientId: creds.clientId }
  return {
    id: row.id,
    platform: row.platform as Platform,
    storeName: row.storeName,
    enabled: row.enabled,
    lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
    credentials: safe,
  }
}

export async function updateAccount(
  id: string,
  input: { storeName?: string; credentials?: AccountCredentials; enabled?: boolean },
): Promise<{ id: string }> {
  const data: Record<string, unknown> = {}
  if (input.storeName !== undefined) data.storeName = input.storeName
  if (input.enabled !== undefined) data.enabled = input.enabled
  if (input.credentials) data.credentials = encryptCredentials(input.credentials)
  return prisma.integrationAccount.update({ where: { id }, data, select: { id: true } })
}

export async function deleteAccount(id: string): Promise<void> {
  await prisma.integrationAccount.delete({ where: { id } })
}
