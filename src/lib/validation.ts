import { z } from "zod"

export function getZodIssues(e: unknown): z.ZodIssue[] | null {
  if (e && typeof e === "object" && "issues" in e && Array.isArray(e.issues)) {
    return e.issues as z.ZodIssue[]
  }
  return null
}

export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")

export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário deve estar no formato HH:mm")

export const addressFields = {
  addressCep: z.string().trim().max(9, "CEP inválido").optional().nullable(),
  addressStreet: z.string().trim().max(120).optional().nullable(),
  addressNumber: z.string().trim().max(20).optional().nullable(),
  addressComplement: z.string().trim().max(80).optional().nullable(),
  addressNeighborhood: z.string().trim().max(80).optional().nullable(),
  addressCity: z.string().trim().max(80).optional().nullable(),
  addressState: z.string().trim().length(2, "Estado deve ter 2 letras (UF)").optional().nullable(),
}

export const deliveryAddressFields = {
  deliveryCep: z.string().trim().max(9, "CEP inválido").optional().nullable(),
  deliveryStreet: z.string().trim().max(120).optional().nullable(),
  deliveryNumber: z.string().trim().max(20).optional().nullable(),
  deliveryComplement: z.string().trim().max(80).optional().nullable(),
  deliveryNeighborhood: z.string().trim().max(80).optional().nullable(),
  deliveryCity: z.string().trim().max(80).optional().nullable(),
  deliveryState: z.string().trim().length(2, "Estado deve ter 2 letras (UF)").optional().nullable(),
}

export const createOrderSchema = z.object({
  channel: z.string().min(1, "Canal é obrigatório"),
  customer: z.string().min(1, "Cliente é obrigatório"),
  total: z.number().min(0, "Total deve ser positivo"),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1),
        price: z.number().min(0),
      }),
    )
    .min(1, "Pelo menos 1 item"),
  deliveryDate: dateKeySchema.optional().nullable(),
  deliveryRouteId: z.string().min(1).optional().nullable(),
  ...deliveryAddressFields,
})

export const ORDER_STATUSES = [
  "PENDENTE",
  "CONFIRMADO",
  "PRODUCAO",
  "PRONTO",
  "ENTREGA",
  "CONCLUIDO",
  "CANCELADO",
] as const

export const updateOrderSchema = z.object({
  channel: z.string().min(1).optional(),
  customer: z.string().min(1).optional(),
  notes: z.string().optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  deliveryDate: dateKeySchema.optional().nullable(),
  deliveryRouteId: z.string().min(1).optional().nullable(),
  ...deliveryAddressFields,
})

export const createSaleSchema = z.object({
  channelId: z.string().min(1, "Canal é obrigatório"),
  total: z.number().min(0),
  userId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1),
        price: z.number().min(0),
      }),
    )
    .min(1, "Pelo menos 1 item"),
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
  image: z.string().nullable().optional(),
  active: z.boolean().optional(),
  description: z.string().nullable().optional(),
})

export const createProductSyncSchema = createProductSchema.extend({
  image: z.string().nullable().optional(),
  active: z.boolean().optional(),
})

export const createRecipeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  yield: z.number().int().min(1),
  yieldUnit: z.string().optional(),
  productId: z.string().nullable().optional(),
  totalCost: z.number().min(0),
  preparation: z.string().optional(),
  image: z.string().optional(),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        qty: z.number().min(0),
        unit: z.string(),
      }),
    )
    .optional(),
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
  enabled: z.boolean().optional(),
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
  image: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
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
  productId: z.string().nullable().optional(),
  totalCost: z.number().min(0).optional(),
  preparation: z.string().optional(),
  image: z.string().optional(),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        qty: z.number().min(0),
        unit: z.string(),
      }),
    )
    .optional(),
})

export const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(["FICHA_TECNICA", "MODO_PREPARO", "HIGIENE", "MANIPULACAO", "TREINAMENTO", "OUTROS"]).optional(),
  content: z.string().optional(),
  fileUrl: z.string().nullable().optional(),
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
  enabled: z.boolean().optional(),
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

export const registerCustomerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
})

export const loginCustomerSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
})

export const createCustomerOrderSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          qty: z.number().int().min(1).max(100, "Quantidade máxima por item é 100"),
        }),
      )
      .min(1, "Adicione ao menos 1 item")
      .max(50, "Máximo de 50 itens por pedido"),
    couponCode: z.string().trim().max(50).optional().nullable(),
    paymentMethod: z.enum(["PIX"]).optional().nullable(),
    notes: z.string().trim().max(1000, "Observações muito longas (máx. 1000 caracteres)").optional().nullable(),
    expectedTotal: z.number().finite().optional().nullable(),
    deliveryDate: dateKeySchema.optional().nullable(),
    deliveryRouteId: z.string().min(1).optional().nullable(),
    ...deliveryAddressFields,
  })
  .superRefine((data, ctx) => {
    const hasDelivery = Boolean(data.deliveryDate) || Boolean(data.deliveryRouteId)
    if (hasDelivery && !data.deliveryDate) {
      ctx.addIssue({ code: "custom", path: ["deliveryDate"], message: "Informe a data da entrega" })
    }
    if (hasDelivery && !data.deliveryRouteId) {
      ctx.addIssue({ code: "custom", path: ["deliveryRouteId"], message: "Selecione uma rota de entrega" })
    }
    if (hasDelivery && !data.deliveryStreet) {
      ctx.addIssue({ code: "custom", path: ["deliveryStreet"], message: "Informe a rua para entrega" })
    }
    if (hasDelivery && !data.deliveryNumber) {
      ctx.addIssue({ code: "custom", path: ["deliveryNumber"], message: "Informe o número para entrega" })
    }
    if (hasDelivery && !data.deliveryCity) {
      ctx.addIssue({ code: "custom", path: ["deliveryCity"], message: "Informe a cidade para entrega" })
    }
    if (hasDelivery && !data.deliveryState) {
      ctx.addIssue({ code: "custom", path: ["deliveryState"], message: "Informe o estado (UF) para entrega" })
    }
  })

export const updateCustomerOrderSchema = z
  .object({
    status: z.literal("CANCELADO").optional(),
    deliveryDate: dateKeySchema.optional().nullable(),
    deliveryRouteId: z.string().min(1).optional().nullable(),
    ...deliveryAddressFields,
  })
  .superRefine((data, ctx) => {
    const hasDelivery = Boolean(data.deliveryDate) || Boolean(data.deliveryRouteId)
    if (hasDelivery && !data.deliveryDate) {
      ctx.addIssue({ code: "custom", path: ["deliveryDate"], message: "Informe a data da entrega" })
    }
    if (hasDelivery && !data.deliveryRouteId) {
      ctx.addIssue({ code: "custom", path: ["deliveryRouteId"], message: "Selecione uma rota de entrega" })
    }
    if (data.deliveryStreet !== undefined && !data.deliveryStreet) {
      ctx.addIssue({ code: "custom", path: ["deliveryStreet"], message: "Rua não pode ficar vazia" })
    }
  })

export const deliveryZoneSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  active: z.boolean().optional().default(true),
})

export const deliveryRouteSchema = z
  .object({
    name: z.string().trim().min(1, "Nome é obrigatório"),
    zoneId: z.string().min(1, "Zona é obrigatória"),
    recurring: z.boolean().optional().default(true),
    dayOfWeek: z.number().int().min(1, "Dia da semana deve ser entre 1 e 7").max(7).nullable().optional(),
    date: dateKeySchema.nullable().optional(),
    startDate: dateKeySchema.nullable().optional(),
    endDate: dateKeySchema.nullable().optional(),
    cutoffTime: timeSchema.optional().default("18:00"),
    cutoffOffsetDays: z.number().int().min(0, "Offset deve ser entre 0 e 7").max(7).optional().default(1),
    windowStart: timeSchema.optional().default("12:00"),
    windowEnd: timeSchema.optional().default("18:00"),
    capacityEnabled: z.boolean().optional().default(false),
    maxOrders: z.number().int().min(1).nullable().optional(),
    maxItems: z.number().int().min(1).nullable().optional(),
    active: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.recurring && !data.dayOfWeek) {
      ctx.addIssue({ code: "custom", path: ["dayOfWeek"], message: "Rota recorrente precisa de um dia da semana" })
    }
    if (!data.recurring && !data.date) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Rota extraordinária precisa de uma data" })
    }
    if (data.capacityEnabled && !data.maxOrders && !data.maxItems) {
      ctx.addIssue({
        code: "custom",
        path: ["maxOrders"],
        message: "Com capacidade ativa, defina limite de pedidos ou itens",
      })
    }
  })

export const deliveryRouteUpdateSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").optional(),
  zoneId: z.string().min(1, "Zona é obrigatória").optional(),
  recurring: z.boolean().optional(),
  dayOfWeek: z.number().int().min(1, "Dia da semana deve ser entre 1 e 7").max(7).nullable().optional(),
  date: dateKeySchema.nullable().optional(),
  startDate: dateKeySchema.nullable().optional(),
  endDate: dateKeySchema.nullable().optional(),
  cutoffTime: timeSchema.optional(),
  cutoffOffsetDays: z.number().int().min(0, "Offset deve ser entre 0 e 7").max(7).optional(),
  windowStart: timeSchema.optional(),
  windowEnd: timeSchema.optional(),
  capacityEnabled: z.boolean().optional(),
  maxOrders: z.number().int().min(1).nullable().optional(),
  maxItems: z.number().int().min(1).nullable().optional(),
  active: z.boolean().optional(),
})

export const deliveryBlockSchema = z.object({
  zoneId: z.string().min(1, "Zona é obrigatória"),
  date: dateKeySchema,
  reason: z.string().trim().max(200).optional().nullable(),
})

export const updateCustomerProfileSchema = z
  .object({
    name: z.string().trim().min(1, "Nome é obrigatório").optional(),
    phone: z.string().optional().nullable(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
    ...addressFields,
  })
  .refine((d) => !!d.currentPassword === !!d.newPassword, {
    message: "Para alterar a senha, informe a senha atual e a nova senha",
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.phone !== undefined ||
      d.newPassword !== undefined ||
      d.addressStreet !== undefined ||
      d.addressNumber !== undefined ||
      d.addressCep !== undefined ||
      d.addressComplement !== undefined ||
      d.addressNeighborhood !== undefined ||
      d.addressCity !== undefined ||
      d.addressState !== undefined,
    {
      message: "Nada para atualizar",
    },
  )
