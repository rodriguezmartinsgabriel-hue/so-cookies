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

export const ORDER_STATUSES = ["PENDENTE", "CONFIRMADO", "PRODUCAO", "PRONTO", "ENTREGA", "CONCLUIDO", "CANCELADO"] as const

export const updateOrderSchema = z.object({
  channel: z.string().min(1).optional(),
  customer: z.string().min(1).optional(),
  notes: z.string().optional(),
  status: z.enum(ORDER_STATUSES).optional(),
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
  description: z.string().optional(),
  amount: z.number().min(0, "Valor deve ser positivo"),
  userId: z.string().optional(),
  date: z.string().optional(),
})

export const updateCashFlowSchema = z.object({
  type: z.enum(["ENTRADA", "SAIDA"]).optional(),
  category: z.string().min(1).optional(),
  description: z.string().optional(),
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

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  margin: z.number().optional(),
  active: z.boolean().optional(),
  category: z.string().optional(),
  sku: z.string().optional(),
  unit: z.string().optional(),
  image: z.string().optional(),
})

export const updateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  commission: z.number().min(0).optional(),
})

export const updateProductionSchema = z.object({
  status: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
  qty: z.number().int().min(0).optional(),
})

export const updateRecipeSchema = z.object({
  name: z.string().min(1).optional(),
  yield: z.number().int().min(1).optional(),
  yieldUnit: z.string().optional(),
  productId: z.string().optional(),
  totalCost: z.number().min(0).optional(),
  ingredients: z.array(z.object({
    ingredientId: z.string().min(1),
    qty: z.number().min(0),
    unit: z.string(),
  })).optional(),
})

export const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(["FICHA_TECNICA", "MODO_PREPARO", "HIGIENE", "MANIPULACAO", "TREINAMENTO", "OUTROS"]).optional(),
  content: z.string().optional(),
  fileUrl: z.string().optional(),
  tags: z.string().optional(),
})

export const updateDeliveryCostSchema = z.object({
  channel: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  orderId: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().optional(),
})

export const updatePriceTierSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1).optional(),
  minQty: z.number().int().min(0).optional(),
  maxQty: z.number().int().optional(),
  price: z.number().min(0).optional(),
})

export const USER_ROLES = ["ADMIN", "OPERACIONAL", "VISUALIZADOR"] as const

export const createUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  role: z.enum(USER_ROLES).default("OPERACIONAL"),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(USER_ROLES).optional(),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
})

export const CONTACT_TYPES = ["CLIENTE", "FORNECEDOR", "LEAD", "OUTRO"] as const
export const INTERACTION_TYPES = ["NOTA", "LIGACAO", "EMAIL", "WHATSAPP", "VISITA", "OUTRO"] as const

const optionalEmail = z.union([z.string().email("E-mail inválido"), z.literal("")]).optional()

export const createContactSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: optionalEmail,
  phone: z.string().optional(),
  type: z.enum(CONTACT_TYPES).default("CLIENTE"),
  company: z.string().optional(),
  notes: z.string().optional(),
})

export const updateContactSchema = z.object({
  name: z.string().min(1).optional(),
  email: optionalEmail,
  phone: z.string().optional(),
  type: z.enum(CONTACT_TYPES).optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
})

export const createInteractionSchema = z.object({
  type: z.enum(INTERACTION_TYPES).default("NOTA"),
  note: z.string().min(1, "Descreva a interação"),
})
