// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest"

const store = vi.hoisted(() => {
  const contacts = new Map<string, Record<string, unknown>>()
  let id = 0

  function reset() {
    contacts.clear()
    id = 0
  }

  const mockPrisma = {
    contact: {
      findFirst: async ({ where }: { where?: Record<string, unknown> }) => {
        const or = where?.OR as ({ customerId?: string; email?: string; type?: string } | undefined)[] | undefined
        if (or) {
          for (const cond of or) {
            if (cond?.customerId) {
              const hit = [...contacts.values()].find((c) => c.customerId === cond.customerId)
              if (hit) return hit
            }
            if (cond?.email && cond.type) {
              const emailCond = cond.email as string | { equals: string }
              const targetEmail =
                typeof emailCond === "object" && emailCond !== null
                  ? emailCond.equals.toLowerCase()
                  : String(emailCond).toLowerCase()
              const hit = [...contacts.values()].find(
                (c) => String(c.email ?? "").toLowerCase() === targetEmail && c.type === cond.type,
              )
              if (hit) return hit
            }
          }
          return null
        }
        return null
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const contact = { id: `ct-${++id}`, createdAt: new Date(), updatedAt: new Date(), ...data }
        contacts.set(contact.id as string, contact)
        return contact
      },
      update: async ({ where, data }: { where?: Record<string, unknown>; data: Record<string, unknown> }) => {
        const existing = contacts.get((where?.id as string) ?? "")
        if (!existing) throw new Error("contact not found")
        const updated = { ...existing, ...data }
        contacts.set(existing.id as string, updated)
        return updated
      },
    },
  }

  return { mockPrisma, contacts, reset }
})

vi.mock("@/lib/prisma", () => ({ prisma: store.mockPrisma }))

import { syncCustomerToContact, CUSTOMER_CONTACT_NOTE } from "@/lib/customer-contact"

function baseContact(overrides: Record<string, unknown> = {}) {
  return { createdAt: new Date(), updatedAt: new Date(), ...overrides }
}

describe("syncCustomerToContact", () => {
  beforeEach(() => store.reset())

  it("cria contato CLIENTE com nota e vínculo quando não existe", async () => {
    const result = await syncCustomerToContact({
      id: "cust-1",
      name: "Maria",
      email: "maria@test.com",
      phone: "11999999999",
    })
    expect(result.created).toBe(true)
    const contact = [...store.contacts.values()][0]
    expect(contact).toMatchObject({
      name: "Maria",
      email: "maria@test.com",
      phone: "11999999999",
      type: "CLIENTE",
      notes: CUSTOMER_CONTACT_NOTE,
      customerId: "cust-1",
    })
  })

  it("cria contato sem phone quando o cliente não tem phone", async () => {
    await syncCustomerToContact({ id: "cust-1", name: "João", email: "joao@test.com", phone: null })
    const contact = [...store.contacts.values()][0]
    expect(contact.phone).toBeNull()
  })

  it("vincula contato manual existente (mesmo email) e preenche lacunas", async () => {
    store.contacts.set(
      "ct-manual",
      baseContact({
        id: "ct-manual",
        name: "",
        email: "maria@test.com",
        phone: null,
        type: "CLIENTE",
        notes: "contato do whatsapp",
        customerId: null,
      }),
    )
    const result = await syncCustomerToContact({
      id: "cust-1",
      name: "Maria",
      email: "maria@test.com",
      phone: "11999999999",
    })
    expect(result.created).toBe(false)
    const contact = store.contacts.get("ct-manual")!
    expect(contact.customerId).toBe("cust-1")
    expect(contact.name).toBe("Maria")
    expect(contact.phone).toBe("11999999999")
    expect(contact.notes).toBe("contato do whatsapp")
  })

  it("não duplica quando já existe contato vinculado ao customerId", async () => {
    store.contacts.set(
      "ct-1",
      baseContact({
        id: "ct-1",
        name: "Maria",
        email: "maria@test.com",
        phone: null,
        type: "CLIENTE",
        notes: "n",
        customerId: "cust-1",
      }),
    )
    const result = await syncCustomerToContact({ id: "cust-1", name: "Maria", email: "maria@test.com" })
    expect(result.created).toBe(false)
    expect(result.contactId).toBe("ct-1")
    expect(store.contacts.size).toBe(1)
  })

  it("cliente é a fonte da verdade: sobrescreve nome/telefone, preserva notes/type/company", async () => {
    store.contacts.set(
      "ct-1",
      baseContact({
        id: "ct-1",
        name: "Maria Silva (Loja)",
        email: "maria@test.com",
        phone: "11988888888",
        type: "CLIENTE",
        company: "Loja da Maria",
        notes: "nota do manager",
        customerId: "cust-1",
      }),
    )
    await syncCustomerToContact({ id: "cust-1", name: "Maria", email: "maria@test.com", phone: "11999999999" })
    const contact = store.contacts.get("ct-1")!
    expect(contact.name).toBe("Maria")
    expect(contact.phone).toBe("11999999999")
    expect(contact.notes).toBe("nota do manager")
    expect(contact.company).toBe("Loja da Maria")
    expect(contact.type).toBe("CLIENTE")
  })

  it("cria contato com endereço completo", async () => {
    const result = await syncCustomerToContact({
      id: "cust-1",
      name: "Maria",
      email: "maria@test.com",
      addressCep: "12345-678",
      addressStreet: "Rua A",
      addressNumber: "100",
      addressComplement: "Apto 5",
      addressNeighborhood: "Centro",
      addressCity: "São Paulo",
      addressState: "SP",
    })
    expect(result.created).toBe(true)
    const contact = [...store.contacts.values()][0]
    expect(contact).toMatchObject({
      addressCep: "12345-678",
      addressStreet: "Rua A",
      addressNumber: "100",
      addressComplement: "Apto 5",
      addressNeighborhood: "Centro",
      addressCity: "São Paulo",
      addressState: "SP",
    })
  })

  it("sobrescreve endereço do contato quando o cliente fornece novo endereço", async () => {
    store.contacts.set(
      "ct-1",
      baseContact({
        id: "ct-1",
        name: "Maria",
        email: "maria@test.com",
        phone: null,
        type: "CLIENTE",
        notes: "n",
        customerId: "cust-1",
        addressStreet: "Rua Antiga",
        addressCity: "Campinas",
        addressCep: "00000-000",
      }),
    )
    await syncCustomerToContact({
      id: "cust-1",
      name: "Maria",
      email: "maria@test.com",
      addressStreet: "Rua Nova",
      addressCity: "São Paulo",
      addressState: "SP",
    })
    const contact = store.contacts.get("ct-1")!
    expect(contact.addressStreet).toBe("Rua Nova")
    expect(contact.addressCity).toBe("São Paulo")
    expect(contact.addressState).toBe("SP")
    expect(contact.addressCep).toBe("00000-000")
  })

  it("limpa endereço com null quando o cliente informa null", async () => {
    store.contacts.set(
      "ct-1",
      baseContact({
        id: "ct-1",
        name: "Maria",
        email: "maria@test.com",
        phone: null,
        type: "CLIENTE",
        notes: "n",
        customerId: "cust-1",
        addressStreet: "Rua Antiga",
        addressCity: "Campinas",
      }),
    )
    await syncCustomerToContact({ id: "cust-1", name: "Maria", email: "maria@test.com", addressStreet: null })
    const contact = store.contacts.get("ct-1")!
    expect(contact.addressStreet).toBeNull()
    expect(contact.addressCity).toBe("Campinas")
  })

  it("tenta novamente quando o create falha na primeira vez", async () => {
    const originalCreate = store.mockPrisma.contact.create
    let calls = 0
    store.mockPrisma.contact.create = async (args) => {
      calls++
      if (calls === 1) throw new Error("boom")
      return originalCreate(args)
    }
    const logSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const result = await syncCustomerToContact({ id: "cust-1", name: "Maria", email: "maria@test.com" })
    expect(calls).toBe(2)
    expect(result.created).toBe(true)
    expect(logSpy).toHaveBeenCalled()
    logSpy.mockRestore()
  })

  it("lança após falhar as duas tentativas", async () => {
    const originalCreate = store.mockPrisma.contact.create
    store.mockPrisma.contact.create = async () => {
      throw new Error("boom")
    }
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    await expect(syncCustomerToContact({ id: "cust-1", name: "Maria", email: "maria@test.com" })).rejects.toThrow(
      "boom",
    )
    expect(logSpy).toHaveBeenCalled()
    logSpy.mockRestore()
    store.mockPrisma.contact.create = originalCreate
  })
})
