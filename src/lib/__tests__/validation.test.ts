import { describe, it, expect } from "vitest"
import {
  createOrderSchema,
  createSaleSchema,
  createIngredientSchema,
  createCashFlowSchema,
  createRecipeSchema,
  updateRecipeSchema,
  createDocumentSchema,
  updateDocumentSchema,
  createProductionSchema,
  createPriceTierSchema,
  createProductSchema,
  updateCustomerProfileSchema,
  createCustomerOrderSchema,
} from "@/lib/validation"

describe("createOrderSchema", () => {
  it("accepts valid order", () => {
    const result = createOrderSchema.parse({
      channel: "WhatsApp",
      customer: "João",
      total: 50,
      items: [{ productId: "p1", qty: 2, price: 25 }],
    })
    expect(result.customer).toBe("João")
  })

  it("rejects empty customer", () => {
    expect(() =>
      createOrderSchema.parse({
        channel: "WhatsApp",
        customer: "",
        total: 50,
        items: [{ productId: "p1", qty: 2, price: 25 }],
      }),
    ).toThrow()
  })

  it("rejects empty items", () => {
    expect(() =>
      createOrderSchema.parse({
        channel: "WhatsApp",
        customer: "João",
        total: 0,
        items: [],
      }),
    ).toThrow()
  })
})

describe("createSaleSchema", () => {
  it("accepts valid sale", () => {
    const result = createSaleSchema.parse({
      channelId: "c1",
      total: 100,
      items: [{ productId: "p1", qty: 1, price: 100 }],
    })
    expect(result.channelId).toBe("c1")
  })
})

describe("createIngredientSchema", () => {
  it("accepts valid ingredient", () => {
    const result = createIngredientSchema.parse({
      name: "Farinha",
      costPerKg: 5,
      supplier: "Fornecedor A",
    })
    expect(result.name).toBe("Farinha")
  })

  it("rejects missing name", () => {
    expect(() =>
      createIngredientSchema.parse({
        costPerKg: 5,
        supplier: "Fornecedor A",
      }),
    ).toThrow()
  })
})

describe("createProductSchema", () => {
  it("accepts product with image and active", () => {
    const result = createProductSchema.parse({
      name: "Cookie Clássico",
      sku: "ck-classico",
      category: "Doces",
      price: 5,
      cost: 2.5,
      unit: "un",
      image: "data:image/jpeg;base64,/9j/2Q==",
      active: false,
    })
    expect(result.image).toContain("data:image/jpeg")
    expect(result.active).toBe(false)
  })

  it("accepts product without optional fields", () => {
    const result = createProductSchema.parse({
      name: "Cookie",
      sku: "ck",
      category: "Doces",
      price: 5,
      cost: 2.5,
    })
    expect(result.image).toBeUndefined()
    expect(result.active).toBeUndefined()
  })
})

describe("createRecipeSchema", () => {
  it("accepts recipe with preparation and image", () => {
    const result = createRecipeSchema.parse({
      name: "Cookie Clássico",
      yield: 11,
      yieldUnit: "un",
      totalCost: 29.21,
      preparation: "1. Misturar os secos.\n2. Adicionar manteiga.",
      image: "data:image/jpeg;base64,/9j/2Q==",
      ingredients: [{ ingredientId: "ing1", qty: 0.1, unit: "kg" }],
    })
    expect(result.preparation).toContain("Misturar")
    expect(result.image).toContain("data:image/jpeg")
  })

  it("accepts recipe without optional fields", () => {
    const result = createRecipeSchema.parse({
      name: "Cookie Clássico",
      yield: 11,
      totalCost: 29.21,
    })
    expect(result.preparation).toBeUndefined()
    expect(result.image).toBeUndefined()
  })

  it("rejects empty name", () => {
    expect(() => createRecipeSchema.parse({ name: "", yield: 11, totalCost: 1 })).toThrow()
  })
})

describe("updateRecipeSchema", () => {
  it("accepts partial update with preparation and image", () => {
    const result = updateRecipeSchema.parse({
      preparation: "Assar a 180°C por 12 min.",
      image: "data:image/png;base64,iVBORw0KGgo=",
    })
    expect(result.preparation).toContain("Assar")
    expect(result.image).toContain("data:image/png")
  })

  it("accepts productId null para desvincular do produto", () => {
    const result = updateRecipeSchema.parse({ productId: null })
    expect(result.productId).toBeNull()
  })
})

describe("createCashFlowSchema", () => {
  it("accepts valid entrada", () => {
    const result = createCashFlowSchema.parse({
      type: "ENTRADA",
      category: "Vendas",
      description: "Venda do dia",
      amount: 500,
    })
    expect(result.type).toBe("ENTRADA")
  })

  it("accepts valid saida", () => {
    const result = createCashFlowSchema.parse({
      type: "SAIDA",
      category: "Fornecedores",
      description: "Compra de insumos",
      amount: 200,
    })
    expect(result.amount).toBe(200)
  })

  it("rejects invalid type", () => {
    expect(() =>
      createCashFlowSchema.parse({
        type: "INVALIDO",
        category: "Vendas",
        description: "teste",
        amount: 100,
      }),
    ).toThrow()
  })
})

describe("createDocumentSchema", () => {
  it("accepts document with pdf attachment", () => {
    const result = createDocumentSchema.parse({
      title: "Ficha técnica Cookie",
      category: "FICHA_TECNICA",
      description: "Ficha oficial",
      fileUrl: "data:application/pdf;base64,JVBERi0xLjQK",
      tags: "cookie",
    })
    expect(result.title).toBe("Ficha técnica Cookie")
    expect(result.fileUrl).toContain("data:application/pdf")
  })

  it("accepts document with photo attachment", () => {
    const result = createDocumentSchema.parse({
      title: "Higiene das mãos",
      category: "HIGIENE",
      fileUrl: "data:image/jpeg;base64,/9j/2Q==",
    })
    expect(result.fileUrl).toContain("data:image/jpeg")
  })

  it("rejects empty title", () => {
    expect(() => createDocumentSchema.parse({ title: "", category: "OUTROS" })).toThrow()
  })
})

describe("updateDocumentSchema", () => {
  it("accepts partial update", () => {
    const result = updateDocumentSchema.parse({ title: "Novo título" })
    expect(result.title).toBe("Novo título")
  })

  it("accepts fileUrl update", () => {
    const result = updateDocumentSchema.parse({ fileUrl: "data:image/png;base64,iVBORw0KGgo=" })
    expect(result.fileUrl).toContain("data:image/png")
  })

  it("accepts null fileUrl to clear attachment", () => {
    const result = updateDocumentSchema.parse({ fileUrl: null })
    expect(result.fileUrl).toBeNull()
  })
})

describe("createProductionSchema", () => {
  it("accepts valid production", () => {
    const result = createProductionSchema.parse({
      batchCode: "LOTE-20260724",
      productId: "p1",
      qty: 20,
      status: "em_producao",
      notes: "Forno 180°C",
    })
    expect(result.batchCode).toBe("LOTE-20260724")
    expect(result.status).toBe("em_producao")
  })

  it("accepts production without status", () => {
    const result = createProductionSchema.parse({
      batchCode: "LOTE-20260724",
      productId: "p1",
      qty: 20,
    })
    expect(result.status).toBeUndefined()
  })

  it("rejects qty zero", () => {
    expect(() =>
      createProductionSchema.parse({
        batchCode: "LOTE-20260724",
        productId: "p1",
        qty: 0,
      }),
    ).toThrow()
  })

  it("rejects missing product", () => {
    expect(() =>
      createProductionSchema.parse({
        batchCode: "LOTE-20260724",
        qty: 20,
      }),
    ).toThrow()
  })
})

describe("createPriceTierSchema", () => {
  it("accepts valid price tier", () => {
    const result = createPriceTierSchema.parse({
      productId: "p1",
      name: "Assado 3un",
      minQty: 3,
      maxQty: 5,
      price: 8,
    })
    expect(result.name).toBe("Assado 3un")
  })

  it("accepts tier without maxQty", () => {
    const result = createPriceTierSchema.parse({
      productId: "p1",
      name: "Unitário",
      minQty: 1,
      price: 10,
    })
    expect(result.maxQty).toBeUndefined()
  })

  it("rejects negative price", () => {
    expect(() =>
      createPriceTierSchema.parse({
        productId: "p1",
        name: "Assado",
        minQty: 1,
        price: -5,
      }),
    ).toThrow()
  })
})

describe("updateCustomerProfileSchema", () => {
  it("accepts name and phone update", () => {
    const result = updateCustomerProfileSchema.parse({ name: "Ana", phone: "(11) 99999-9999" })
    expect(result.name).toBe("Ana")
    expect(result.phone).toBe("(11) 99999-9999")
  })

  it("accepts phone null", () => {
    const result = updateCustomerProfileSchema.parse({ phone: null })
    expect(result.phone).toBeNull()
  })

  it("rejects blank name", () => {
    expect(() => updateCustomerProfileSchema.parse({ name: "   " })).toThrow()
  })

  it("rejects invalid email", () => {
    expect(() => updateCustomerProfileSchema.parse({ email: "nao-e-email" })).toThrow()
  })

  it("rejects short new password", () => {
    expect(() => updateCustomerProfileSchema.parse({ newPassword: "123" })).toThrow()
  })

  it("rejects new password without current password", () => {
    expect(() => updateCustomerProfileSchema.parse({ newPassword: "senha123" })).toThrow()
  })

  it("rejects current password without new password", () => {
    expect(() => updateCustomerProfileSchema.parse({ currentPassword: "velha123" })).toThrow()
  })

  it("rejects empty object (nothing to update)", () => {
    expect(() => updateCustomerProfileSchema.parse({})).toThrow()
  })
})

describe("createCustomerOrderSchema", () => {
  const base = { items: [{ productId: "p1", qty: 2 }] }

  it("aceita paymentMethod PIX", () => {
    expect(createCustomerOrderSchema.safeParse({ ...base, paymentMethod: "PIX" }).success).toBe(true)
  })

  it("aceita pedido sem paymentMethod (padrão atual)", () => {
    expect(createCustomerOrderSchema.safeParse(base).success).toBe(true)
  })

  it("rejeita paymentMethod desconhecido", () => {
    expect(createCustomerOrderSchema.safeParse({ ...base, paymentMethod: "CARTÃO" }).success).toBe(false)
  })
})
