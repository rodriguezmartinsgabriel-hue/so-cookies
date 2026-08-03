import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const url = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL
if (!url) {
  console.error("DATABASE_URL ausente")
  process.exit(1)
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })

async function main() {
  const customers = await prisma.customer.count()
  const linkedContacts = await prisma.contact.count({ where: { customerId: { not: null } } })
  const appNoteContacts = await prisma.contact.count({ where: { notes: "Cliente cadastrado pelo app" } })
  const withoutLink = await prisma.customer.count({ where: { contact: { is: null } } })
  const googleAccounts = await prisma.customerAccount.count({ where: { provider: "google" } })
  console.log(
    JSON.stringify(
      { customers, linkedContacts, appNoteContacts, customersWithoutContact: withoutLink, googleAccounts },
      null,
      2,
    ),
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
