import { describe, it, expect, vi } from "vitest"
import { findOrCreateContact } from "@/lib/db"

type FakeDb = {
  contact: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

function makeDb(existing: unknown | null): FakeDb {
  return {
    contact: {
      findFirst: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue({ id: "new-contact", ...(existing as object) }),
      update: vi.fn().mockResolvedValue({ id: existing && typeof existing === "object" && "id" in existing ? (existing as { id: string }).id : "x", ...(existing as object) }),
    },
  }
}

describe("findOrCreateContact", () => {
  it("cria contato quando não existe duplicata", async () => {
    const db = makeDb(null)
    const result = await findOrCreateContact(db as unknown as never, {
      name: "Ana",
      email: "ana@teste.com",
      phone: "(11) 99999-9999",
    })
    expect(result.created).toBe(true)
    expect(db.contact.create).toHaveBeenCalledTimes(1)
    expect(db.contact.update).not.toHaveBeenCalled()
  })

  it("reusa contato existente por email (ignorando maiúsculas)", async () => {
    const db = makeDb({ id: "c1", name: "Ana", email: "ANA@TESTE.COM", phone: null, customerId: null })
    const result = await findOrCreateContact(db as unknown as never, {
      name: "Ana",
      email: "ana@teste.com",
    })
    expect(result.created).toBe(false)
    expect(db.contact.create).not.toHaveBeenCalled()
    const where = db.contact.findFirst.mock.calls[0][0].where
    expect(where.OR[0]).toEqual({ email: { equals: "ana@teste.com", mode: "insensitive" } })
  })

  it("reusa contato por telefone + nome quando não há email", async () => {
    const db = makeDb({ id: "c2", name: "Bruno", email: null, phone: "11988887777", customerId: null })
    const result = await findOrCreateContact(db as unknown as never, {
      name: "Bruno",
      phone: "11988887777",
    })
    expect(result.created).toBe(false)
    const where = db.contact.findFirst.mock.calls[0][0].where
    expect(where.OR[0]).toEqual({
      phone: { equals: "11988887777", mode: "insensitive" },
      name: { equals: "bruno", mode: "insensitive" },
    })
  })

  it("não reusa contato por telefone quando o nome difere", async () => {
    const db = makeDb({ id: "c3", name: "Carlos", email: null, phone: "11988887777", customerId: null })
    const result = await findOrCreateContact(db as unknown as never, {
      name: "Bruno",
      phone: "11988887777",
    })
    expect(result.created).toBe(false)
    const where = db.contact.findFirst.mock.calls[0][0].where
    expect(where.OR[0].name.equals).toBe("bruno")
    expect(where.OR[0].name.equals).not.toBe("carlos")
  })

  it("preenche lacunas no contato existente via update", async () => {
    const db = makeDb({ id: "c4", name: "Ana", email: "ana@teste.com", phone: null, company: null, notes: null, customerId: null })
    const result = await findOrCreateContact(db as unknown as never, {
      name: "Ana",
      email: "ana@teste.com",
      phone: "(11) 99999-9999",
    })
    expect(result.created).toBe(false)
    expect(db.contact.update).toHaveBeenCalledTimes(1)
    const patch = db.contact.update.mock.calls[0][0].data
    expect(patch.phone).toBe("(11) 99999-9999")
  })

  it("víncula customerId ao contato reutilizado", async () => {
    const db = makeDb({ id: "c5", name: "Ana", email: "ana@teste.com", phone: null, customerId: null })
    const result = await findOrCreateContact(db as unknown as never, {
      name: "Ana",
      email: "ana@teste.com",
      customerId: "cust-1",
    })
    expect(result.created).toBe(false)
    expect(db.contact.update.mock.calls[0][0].data.customerId).toBe("cust-1")
  })
})
