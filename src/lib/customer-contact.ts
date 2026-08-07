import { prisma } from "@/lib/prisma"
import { logger } from "./logger"

export const CUSTOMER_CONTACT_NOTE = "Cliente cadastrado pelo app"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function withRetry<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op()
  } catch (e) {
    logger.warn("[syncCustomerToContact] primeira tentativa falhou; tentando novamente", undefined, e)
    await sleep(200)
    return op()
  }
}

export type CustomerContactInput = {
  id: string
  name: string
  email: string
  phone?: string | null
  addressCep?: string | null
  addressStreet?: string | null
  addressNumber?: string | null
  addressComplement?: string | null
  addressNeighborhood?: string | null
  addressCity?: string | null
  addressState?: string | null
}

const ADDRESS_FIELDS = [
  "addressCep",
  "addressStreet",
  "addressNumber",
  "addressComplement",
  "addressNeighborhood",
  "addressCity",
  "addressState",
] as const

const OVERWRITABLE_FIELDS = ["name", "phone", ...ADDRESS_FIELDS] as const

/**
 * Sincroniza os dados do cliente para o Contact no Manager (Clientes).
 *
 * O cliente é a fonte da verdade: campos fornecidos (diferentes de undefined)
 * sobrescrevem o contato, inclusive com null para limpar. Campos ausentes não
 * são tocados. O e-mail é imutável (não é editável no app) e só é preenchido
 * na criação. type/company/notes/interactions são preservados.
 */
export async function syncCustomerToContact(customer: CustomerContactInput) {
  try {
    const existing = await prisma.contact.findFirst({
      where: {
        OR: [{ customerId: customer.id }, { email: { equals: customer.email, mode: "insensitive" }, type: "CLIENTE" }],
      },
    })

    if (existing) {
      const patch: Record<string, unknown> = {}
      if (existing.customerId !== customer.id) patch.customerId = customer.id
      if (!existing.email && customer.email) patch.email = customer.email
      for (const field of OVERWRITABLE_FIELDS) {
        if (customer[field] !== undefined) patch[field] = customer[field] ?? null
      }
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
          addressCep: customer.addressCep || null,
          addressStreet: customer.addressStreet || null,
          addressNumber: customer.addressNumber || null,
          addressComplement: customer.addressComplement || null,
          addressNeighborhood: customer.addressNeighborhood || null,
          addressCity: customer.addressCity || null,
          addressState: customer.addressState || null,
        },
      }),
    )
    return { contactId: created.id, created: true }
  } catch (e) {
    logger.error(
      "[syncCustomerToContact] falha ao sincronizar contato do cliente",
      { customerId: customer.id, email: customer.email },
      e,
    )
    throw e
  }
}
