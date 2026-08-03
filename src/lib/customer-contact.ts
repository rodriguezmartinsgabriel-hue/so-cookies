import { prisma } from "@/lib/prisma"

export const CUSTOMER_CONTACT_NOTE = "Cliente cadastrado pelo app"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function withRetry<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op()
  } catch (e) {
    console.error("[syncCustomerToContact] primeira tentativa falhou; tentando novamente", e)
    await sleep(200)
    return op()
  }
}

export async function syncCustomerToContact(customer: {
  id: string
  name: string
  email: string
  phone?: string | null
}) {
  try {
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
        await withRetry(() => prisma.contact.update({ where: { id: existing.id }, data: patch }))
      }
      return { contactId: existing.id, created: false }
    }

    const created = await withRetry(() =>
      prisma.contact.create({
        data: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone || null,
          type: "CLIENTE",
          notes: CUSTOMER_CONTACT_NOTE,
          customerId: customer.id,
        },
      }),
    )
    return { contactId: created.id, created: true }
  } catch (e) {
    console.error("[syncCustomerToContact] falha ao sincronizar contato do cliente", {
      customerId: customer.id,
      email: customer.email,
      error: e instanceof Error ? e.message : String(e),
    })
    throw e
  }
}
