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
  lastSyncAt: Date | null
  lastError: string | null
}): AccountRecord {
  return {
    id: row.id,
    platform: row.platform as Platform,
    storeName: row.storeName,
    enabled: row.enabled,
    credentials: decryptCredentials<AccountCredentials>(row.credentials),
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

export async function findIfoodAccountBySignature(rawBody: string, signature: string | null): Promise<AccountRecord | null> {
  if (!signature) return null
  const accounts = await getEnabledAccounts("IFOOD")
  return accounts.find((a) => !is99FoodCredentials(a.credentials) && verifyHmacSha256(rawBody, a.credentials.clientSecret, signature)) || null
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
