import { prisma } from "@/lib/prisma"

export const CUSTOMER_CONTACT_NOTE = "Cliente cadastrado pelo app"

export async function syncCustomerToContact(customer: {
  id: string
  name: string
  email: string
  phone?: string | null
}) {
  const existing = await prisma.contact.findFirst({
    where: {
      OR: [{ customerId: customer.id }, { email: customer.email, type: "CLIENTE" }],
    },
  })

  if (existing) {
    const patch: Record<string, unknown> = {}
    if (existing.customerId !== customer.id) patch.customerId = customer.id
    if (!existing.name && customer.name) patch.name = customer.name
    if (!existing.email && customer.email) patch.email = customer.email
    if (!existing.phone && customer.phone) patch.phone = customer.phone
    if (Object.keys(patch).length > 0) {
      await prisma.contact.update({ where: { id: existing.id }, data: patch })
    }
    return { contactId: existing.id, created: false }
  }

  const created = await prisma.contact.create({
    data: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone || null,
      type: "CLIENTE",
      notes: CUSTOMER_CONTACT_NOTE,
      customerId: customer.id,
    },
  })
  return { contactId: created.id, created: true }
}
