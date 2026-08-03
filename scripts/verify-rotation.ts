import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const url = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL
if (!url) {
  console.error("DATABASE_URL ausente")
  process.exit(1)
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })

async function main() {
  const pong = await prisma.$queryRaw`SELECT 1 as ok`
  if (!pong) throw new Error("Conexão falhou")
  console.log("conexao: OK")

  const customers = await prisma.customer.count()
  const linkedContacts = await prisma.contact.count({ where: { customerId: { not: null } } })
  const appNoteContacts = await prisma.contact.count({ where: { notes: "Cliente cadastrado pelo app" } })
  const withoutLink = await prisma.customer.count({ where: { contact: { is: null } } })
  const googleAccounts = await prisma.customerAccount.count({ where: { provider: "google" } })
  const contacts = await prisma.contact.count()
  const orders = await prisma.order.count()
  const pendingOrders = await prisma.order.count({ where: { status: "PENDENTE" } })

  console.log(
    JSON.stringify(
      {
        customers,
        contacts,
        linkedContacts,
        appNoteContacts,
        customersWithoutContact: withoutLink,
        googleAccounts,
        orders,
        pendingOrders,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((e) => {
    console.error("FALHA:", e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
