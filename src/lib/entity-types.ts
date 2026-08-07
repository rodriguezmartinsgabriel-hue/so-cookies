export type Role = "ADMIN" | "OPERACIONAL" | "VISUALIZADOR"

export type OrderStatus = "PENDENTE" | "CONFIRMADO" | "PRODUCAO" | "PRONTO" | "ENTREGA" | "CONCLUIDO" | "CANCELADO"

export type CashType = "ENTRADA" | "SAIDA"

export type DocumentCategory = "FICHA_TECNICA" | "MODO_PREPARO" | "HIGIENE" | "MANIPULACAO" | "TREINAMENTO" | "OUTROS"

export type ContactType = "CLIENTE" | "FORNECEDOR" | "LEAD" | "OUTRO"

export type InteractionType = "NOTA" | "LIGACAO" | "EMAIL" | "WHATSAPP" | "VISITA" | "OUTRO"

export interface SyncedRow {
  _synced?: boolean
  _updatedAt?: string
}

export type User = {
  id: string
  name: string
  email: string
  password: string
  role: Role
  createdAt: string
  updatedAt: string
}

export type Product = {
  id: string
  name: string
  sku: string
  category: string
  price: number
  cost: number
  margin: number
  unit: string
  active: boolean
  image: string | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export type Ingredient = {
  id: string
  name: string
  brand: string | null
  stockKg: number
  minStockKg: number
  costPerKg: number
  supplier: string
  lastPurchase: string | null
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
  createdAt: string
  updatedAt: string
}

export type RecipeItem = {
  id: string
  qty: number
  unit: string
  recipeId: string
  ingredientId: string
  ingredient?: Ingredient
}

export type Recipe = {
  id: string
  name: string
  yield: number
  yieldUnit: string
  productId: string | null
  totalCost: number
  preparation: string | null
  image: string | null
  createdAt: string
  updatedAt: string
  ingredients?: RecipeItem[]
}

export type PriceTier = {
  id: string
  name: string
  minQty: number
  maxQty: number | null
  price: number
  enabled: boolean
  productId: string
  createdAt: string
  updatedAt: string
}

export type SaleChannel = {
  id: string
  name: string
  commission: number
}

export type SaleItem = {
  id: string
  qty: number
  price: number
  saleId: string
  productId: string
  product?: Product
}

export type Sale = {
  id: string
  total: number
  channelId: string
  userId: string | null
  orderId: string | null
  createdAt: string
  updatedAt: string
  items?: SaleItem[]
}

export type OrderItem = {
  id: string
  qty: number
  price: number
  name: string | null
  notes: string | null
  orderId: string
  productId: string | null
  product?: Product
}

export type Order = {
  id: string
  channel: string
  customer: string
  total: number
  status: OrderStatus
  notes: string | null
  platform: string | null
  externalId: string | null
  externalStatus: string | null
  deliveryAddress: string | null
  deliveryCep: string | null
  deliveryStreet: string | null
  deliveryNumber: string | null
  deliveryComplement: string | null
  deliveryNeighborhood: string | null
  deliveryCity: string | null
  deliveryState: string | null
  deliveryDate: string | null
  deliveryRouteId: string | null
  deliveryZoneId: string | null
  deliveryRouteName?: string | null
  customerPhone: string | null
  platformFee: number | null
  confirmBy: string | null
  pickupCode: string | null
  customerId: string | null
  paymentStatus: string | null
  paymentProvider: string | null
  customerRef?: { id: string; name: string; email: string | null; phone: string | null } | null
  createdAt: string
  updatedAt: string
  items?: OrderItem[]
  sale?: Sale | null
}

export type CashFlow = {
  id: string
  type: CashType
  category: string
  description: string
  amount: number
  date: string
  updatedAt: string
  userId: string | null
}

export type Production = {
  id: string
  batchCode: string
  qty: number
  startTime: string
  endTime: string | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  productId: string
  product?: Product
}

export type DeliveryCost = {
  id: string
  date: string
  channel: string
  orderId: string | null
  amount: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type Document = {
  id: string
  title: string
  description: string | null
  category: DocumentCategory
  content: string | null
  fileUrl: string | null
  tags: string | null
  createdAt: string
  updatedAt: string
  userId: string | null
}

export type ContactInteraction = {
  id: string
  type: InteractionType
  note: string
  createdAt: string
  contactId: string
}

export type Contact = {
  id: string
  name: string
  email: string | null
  phone: string | null
  type: ContactType
  company: string | null
  notes: string | null
  addressCep: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressComplement: string | null
  addressNeighborhood: string | null
  addressCity: string | null
  addressState: string | null
  customerId?: string | null
  createdAt: string
  updatedAt: string
  interactions?: ContactInteraction[]
}

export type Synced<T> = T & SyncedRow

export type SyncedOrder = Synced<Order>
export type SyncedSale = Synced<Sale>
export type SyncedCashFlow = Synced<CashFlow>
export type SyncedProduction = Synced<Production>
export type SyncedProduct = Synced<Product>
export type SyncedIngredient = Synced<Ingredient>
export type SyncedRecipe = Synced<Recipe>
export type SyncedDocument = Synced<Document>
export type SyncedChannel = Synced<SaleChannel>
export type SyncedPriceTier = Synced<PriceTier>
export type SyncedDeliveryCost = Synced<DeliveryCost>
export type SyncedContact = Synced<Contact>
export type SyncedContactInteraction = Synced<ContactInteraction>

export type EntityRowMap = {
  orders: Synced<Order>
  sales: Synced<Sale>
  cashFlow: Synced<CashFlow>
  productions: Synced<Production>
  products: Synced<Product>
  ingredients: Ingredient
  channels: SaleChannel
  priceTiers: PriceTier
  recipes: Synced<Recipe>
  documents: Synced<Document>
  deliveryCosts: Synced<DeliveryCost>
  contacts: Synced<Contact>
}

export type DataEntity = keyof EntityRowMap
export type EntityRow<E extends DataEntity> = EntityRowMap[E]
