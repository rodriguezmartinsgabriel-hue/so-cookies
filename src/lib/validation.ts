import { z } from "zod"

export const createOrderSchema = z.object({
  channel: z.string().min(1, "Canal é obrigatório"),
  customer: z.string().min(1, "Cliente é obrigatório"),
  total: z.number().min(0, "Total deve ser positivo"),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    qty: z.number().int().min(1),
    price: z.number().min(0),
  })).min(1, "Pelo menos 1 item"),
})

export const updateOrderSchema = z.object({
  channel: z.string().min(1).optional(),
  customer: z.string().min(1).optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDENTE", "CONFIRMADO", "PRODUCAO", "PRONTO", "ENTREGA", "CONCLUIDO"]).optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDENTE", "CONFIRMADO", "PRODUCAO", "PRONTO", "ENTREGA", "CONCLUIDO"]),
})

export const createSaleSchema = z.object({
  channelId: z.string().min(1, "Canal é obrigatório"),
  total: z.number().min(0),
  userId: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    qty: z.number().int().min(1),
    price: z.number().min(0),
  })).min(1, "Pelo menos 1 item"),
})

export const createIngredientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  brand: z.string().optional(),
  stockKg: z.number().min(0).optional(),
  minStockKg: z.number().min(0).optional(),
  costPerKg: z.number().min(0, "Custo por kg é obrigatório"),
  supplier: z.string().min(1, "Fornecedor é obrigatório"),
  caloriesPer100g: z.number().optional(),
  proteinPer100g: z.number().optional(),
  carbsPer100g: z.number().optional(),
  fatPer100g: z.number().optional(),
})

export const updateIngredientSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().optional(),
  stockKg: z.number().min(0).optional(),
  minStockKg: z.number().min(0).optional(),
  costPerKg: z.number().min(0).optional(),
  supplier: z.string().min(1).optional(),
  caloriesPer100g: z.number().optional(),
  proteinPer100g: z.number().optional(),
  carbsPer100g: z.number().optional(),
  fatPer100g: z.number().optional(),
})

export const createProductSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  sku: z.string().min(1, "SKU é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  price: z.number().min(0, "Preço deve ser positivo"),
  cost: z.number().min(0, "Custo deve ser positivo"),
  unit: z.string().optional(),
})

export const createRecipeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  yield: z.number().int().min(1),
  yieldUnit: z.string().optional(),
  productId: z.string().optional(),
  totalCost: z.number().min(0),
  ingredients: z.array(z.object({
    ingredientId: z.string().min(1),
    qty: z.number().min(0),
    unit: z.string(),
  })).optional(),
})

export const createCashFlowSchema = z.object({
  type: z.enum(["ENTRADA", "SAIDA"]),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.number().min(0, "Valor deve ser positivo"),
  userId: z.string().optional(),
  date: z.string().optional(),
})

export const updateCashFlowSchema = z.object({
  type: z.enum(["ENTRADA", "SAIDA"]).optional(),
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  date: z.string().optional(),
})

export const createChannelSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  commission: z.number().min(0).optional(),
})

export const createProductionSchema = z.object({
  batchCode: z.string().min(1, "Código do lote é obrigatório"),
  productId: z.string().min(1, "Produto é obrigatório"),
  qty: z.number().int().min(1, "Quantidade deve ser positiva"),
  status: z.string().optional(),
  notes: z.string().optional(),
})

export const createPriceTierSchema = z.object({
  productId: z.string().min(1, "Produto é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório"),
  minQty: z.number().int().min(0),
  maxQty: z.number().int().optional(),
  price: z.number().min(0, "Preço deve ser positivo"),
})

export const createDeliveryCostSchema = z.object({
  channel: z.string().min(1, "Canal é obrigatório"),
  amount: z.number().min(0, "Valor deve ser positivo"),
  orderId: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().optional(),
})

export const createDocumentSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  category: z.enum(["FICHA_TECNICA", "MODO_PREPARO", "HIGIENE", "MANIPULACAO", "TREINAMENTO", "OUTROS"]),
  content: z.string().optional(),
  fileUrl: z.string().optional(),
  tags: z.string().optional(),
  userId: z.string().optional(),
})
