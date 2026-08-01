import { prisma } from "@/lib/prisma"
import { getAllEnabledAccounts } from "./accounts"
import { fetchNineFoodOrder } from "./clients/ninefood"
import { fetchIfoodOrder } from "./clients/ifood"
import { mapExternalToInternal } from "./status"
import type { AccountRecord, Platform } from "./types"

export const RECONCILE_INTERVAL_MS = 5 * 60 * 1000

function staleThreshold(): Date {
  return new Date(Date.now() - RECONCILE_INTERVAL_MS)
}

async function claimAccount(accountId: string): Promise<boolean> {
  const claimed = await prisma.integrationAccount.updateMany({
    where: { id: accountId, OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: staleThreshold() } }] },
    data: { lastSyncAt: new Date() },
  })
  return claimed.count > 0
}

async function reconcileAccount(account: AccountRecord): Promise<void> {
  const platform = account.platform as Platform
  const recentOrders = await prisma.order.findMany({
    where: { platform, externalId: { not: null }, updatedAt: { gt: new Date(Date.now() - 30 * 60 * 1000) } },
    select: { id: true, externalId: true, status: true },
  })

  for (const order of recentOrders) {
    const externalId = order.externalId
    if (!externalId) continue
    const details = platform === "99FOOD" ? await fetchNineFoodOrder(account, externalId) : await fetchIfoodOrder(account, externalId)
    const externalStatus = String(details?.status || "").toUpperCase()
    const internalStatus = externalStatus ? mapExternalToInternal(platform, externalStatus) : order.status
    if (!externalStatus || internalStatus === order.status) continue

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: internalStatus as any,
        externalStatus,
        confirmBy: internalStatus === "PENDENTE" ? new Date(Date.now() + 8 * 60 * 1000) : null,
        updatedAt: new Date(),
      },
    })
  }
}

export async function runLazyReconcile(): Promise<void> {
  const accounts = await getAllEnabledAccounts()
  if (accounts.length === 0) return

  await Promise.all(
    accounts.map(async (account) => {
      if (!(await claimAccount(account.id))) return
      try {
        await reconcileAccount(account)
      } catch (e) {
        await prisma.integrationAccount.update({
          where: { id: account.id },
          data: { lastError: String((e as any)?.message || e), lastSyncAt: null },
        })
      }
    }),
  )
}
