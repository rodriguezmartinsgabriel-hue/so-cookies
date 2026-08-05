import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { decryptCredentials, encryptCredentials, isVersion2Token } from "../src/lib/integrations/crypto"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  const confirm = process.argv.includes("--confirm")
  if (!process.env.INTEGRATION_KEY) {
    console.error("INTEGRATION_KEY não configurada. Abortando.")
    process.exit(1)
  }

  const rows = await prisma.integrationAccount.findMany({ select: { id: true, platform: true, storeName: true, credentials: true } })
  const pending = rows.filter((row) => !isVersion2Token(row.credentials))

  console.log(`Total de contas: ${rows.length}`)
  console.log(`Já em v2: ${rows.length - pending.length}`)
  console.log(`A migrar: ${pending.length}`)
  if (pending.length === 0) {
    console.log("Nada a fazer.")
    return
  }

  for (const row of pending) {
    const creds = decryptCredentials<unknown>(row.credentials)
    const reencrypted = encryptCredentials(creds)
    const label = `${row.platform}${row.storeName ? ` (${row.storeName})` : ""}`
    if (confirm) {
      await prisma.integrationAccount.update({ where: { id: row.id }, data: { credentials: reencrypted } })
      console.log(`Migrada: ${label}`)
    } else {
      console.log(`[dry-run] Migraria: ${label}`)
    }
  }

  if (!confirm) {
    console.log("\nDry-run concluído. Rode novamente com --confirm para aplicar.")
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
