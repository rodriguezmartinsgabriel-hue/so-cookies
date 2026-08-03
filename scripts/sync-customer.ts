import { prisma } from "../src/lib/prisma"
import { syncCustomerToContact } from "../src/lib/customer-contact"

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Uso: npx tsx scripts/sync-customer.ts "<email|id>"')
    process.exit(1)
  }
  const customer = await prisma.customer.findFirst({
    where: { OR: [{ id: arg }, { email: arg.toLowerCase() }] },
    select: { id: true, name: true, email: true, phone: true },
  })
  if (!customer) {
    console.error(`Cliente não encontrado para: ${arg}`)
    process.exit(1)
  }
  const result = await syncCustomerToContact(customer)
  console.log(
    JSON.stringify({ ...customer, contactId: result.contactId, contactCreated: result.created }, null, 2),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
