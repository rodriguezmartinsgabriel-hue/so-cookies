export type Product = {
  id: string;
  name: string;
  sku: string;
  category: "Cookie" | "Brownie" | "Café" | "Bebida" | "Outro";
  price: number;
  cost: number;
  margin: number;
  unit: string;
  active: boolean;
  image?: string;
};

export type Ingredient = {
  id: string;
  name: string;
  brand?: string;
  stockKg: number;
  minStockKg: number;
  costPerKg: number;
  supplier: string;
  unit: string;
  lastPurchase?: string;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
};

export type Supplier = {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
};

export type SaleChannel = {
  id: string;
  name: string;
  commission: number;
};

export type Order = {
  id: string;
  channel: string;
  customer: string;
  items: { product: string; qty: number; price: number }[];
  total: number;
  status: "pendente" | "confirmado" | "producao" | "pronto" | "entrega" | "concluido";
  createdAt: string;
  notes?: string;
};

export type CashFlowEntry = {
  id: string;
  type: "Entrada" | "Saída";
  category: string;
  description: string;
  amount: number;
  date: string;
};

export type Recipe = {
  id: string;
  name: string;
  yield: number;
  yieldUnit: string;
  ingredients: { name: string; qty: number; unit: string; costPerUnit: number }[];
  totalCost: number;
  costPerUnit: number;
};

export const channels: SaleChannel[] = [
  { id: "whatsapp", name: "WhatsApp", commission: 0 },
  { id: "ifood", name: "iFood", commission: 0.23 },
  { id: "rappi", name: "Rappi", commission: 0.20 },
  { id: "direto", name: "Direto", commission: 0 },
];

export const products: Product[] = [
  { id: "ck-classico", name: "Cookie Clássico", sku: "CK-CLASSICO", category: "Cookie", price: 15, cost: 1.547, margin: 89.7, unit: "un", active: true },
  { id: "ck-nino", name: "Cookie Niño", sku: "CK-NINO", category: "Cookie", price: 15, cost: 1.078, margin: 92.8, unit: "un", active: true },
  { id: "ck-3choc", name: "Cookie 3 Chocolates", sku: "CK-3CHOC", category: "Cookie", price: 15, cost: 1.168, margin: 92.2, unit: "un", active: true },
];

export const ingredients: Ingredient[] = [
  { id: "ing-farinha", name: "Farinha de trigo", brand: "Dona Benta", stockKg: 5, minStockKg: 1, costPerKg: 8, supplier: "Distribuidora Local", unit: "g" },
  { id: "ing-manteiga", name: "Manteiga", brand: "Qualy", stockKg: 1.5, minStockKg: 1.5, costPerKg: 40, supplier: "Atacado Central", unit: "g" },
  { id: "ing-acucar-ref", name: "Açúcar refinado", brand: "União", stockKg: 2, minStockKg: 0.5, costPerKg: 6, supplier: "Distribuidora Local", unit: "g" },
  { id: "ing-acucar-masc", name: "Açúcar mascavo", brand: "Voquezal", stockKg: 2, minStockKg: 0.5, costPerKg: 10, supplier: "Distribuidora Local", unit: "g" },
  { id: "ing-ovos", name: "Ovos", brand: "Granja Modelo", stockKg: 1, minStockKg: 0.5, costPerKg: 16, supplier: "Granja Modelo", unit: "un" },
  { id: "ing-choc-meio", name: "Chocolate meio amargo (gotas)", brand: "Harald", stockKg: 2.4, minStockKg: 1, costPerKg: 110, supplier: "Fornecedor Chocolates", unit: "g" },
  { id: "ing-sal", name: "Sal", brand: "Lebre", stockKg: 0.5, minStockKg: 0.2, costPerKg: 20, supplier: "Distribuidora Local", unit: "g" },
  { id: "ing-leite-ninho", name: "Leite Ninho em pó", brand: "Nestlé", stockKg: 0.5, minStockKg: 0.3, costPerKg: 60, supplier: "Distribuidora Local", unit: "g" },
  { id: "ing-choc-branco", name: "Chocolate branco (gotas)", brand: "Harald", stockKg: 0.8, minStockKg: 0.3, costPerKg: 50, supplier: "Fornecedor Chocolates", unit: "g" },
  { id: "ing-choc-mix", name: "Mix chocolate branco/meio amargo/ao leite", brand: "Harald", stockKg: 0.8, minStockKg: 0.3, costPerKg: 47, supplier: "Fornecedor Chocolates", unit: "g" },
  { id: "ing-choc-cobertura", name: "Chocolate meio amargo (cobertura)", brand: "Harald", stockKg: 0.5, minStockKg: 0.2, costPerKg: 45, supplier: "Fornecedor Chocolates", unit: "g" },
];

export const suppliers: Supplier[] = [
  { id: "sup-1", name: "Distribuidora Local", phone: "(11) 99999-0001" },
  { id: "sup-2", name: "Atacado Central", phone: "(11) 99999-0002" },
  { id: "sup-3", name: "Fornecedor Chocolates", phone: "(11) 99999-0003" },
  { id: "sup-4", name: "Granja Modelo", phone: "(11) 99999-0004" },
];

export const orders: Order[] = [
  { id: "001", channel: "iFood", customer: "Maria Silva", items: [{ product: "Cookie Clássico", qty: 6, price: 13 }, { product: "Cookie Niño", qty: 2, price: 13 }], total: 104, status: "pendente", createdAt: "10:30" },
  { id: "002", channel: "WhatsApp", customer: "João Santos", items: [{ product: "Cookie 3 Chocolates", qty: 10, price: 10 }], total: 100, status: "confirmado", createdAt: "10:45" },
  { id: "003", channel: "Direto", customer: "Ana Costa", items: [{ product: "Cookie Clássico", qty: 3, price: 13 }, { product: "Cookie Niño", qty: 3, price: 13 }], total: 78, status: "producao", createdAt: "11:00" },
  { id: "004", channel: "WhatsApp", customer: "Pedro Lima", items: [{ product: "Cookie 3 Chocolates", qty: 4, price: 13 }], total: 52, status: "pronto", createdAt: "09:30" },
  { id: "005", channel: "iFood", customer: "Lucia Ferreira", items: [{ product: "Cookie Clássico", qty: 1, price: 15 }], total: 15, status: "entrega", createdAt: "11:15" },
  { id: "006", channel: "Direto", customer: "Carlos Souza", items: [{ product: "Cookie Niño", qty: 12, price: 10 }], total: 120, status: "concluido", createdAt: "08:00" },
];

export const cashFlow: CashFlowEntry[] = [
  { id: "cf-1", type: "Saída", category: "Insumos", description: "Compra de farinha, manteiga e chocolate", amount: -320, date: "2026-07-01" },
  { id: "cf-2", type: "Entrada", category: "Vendas", description: "Vendas da semana (iFood + direto)", amount: 450, date: "2026-07-20" },
];

export const recipes: Recipe[] = [
  {
    id: "rec-classico",
    name: "Cookie Clássico",
    yield: 20,
    yieldUnit: "un",
    ingredients: [
      { name: "Farinha de trigo", qty: 210, unit: "g", costPerUnit: 0.008 },
      { name: "Manteiga", qty: 100, unit: "g", costPerUnit: 0.04 },
      { name: "Açúcar refinado", qty: 60, unit: "g", costPerUnit: 0.006 },
      { name: "Açúcar mascavo", qty: 120, unit: "g", costPerUnit: 0.01 },
      { name: "Ovos", qty: 2, unit: "un", costPerUnit: 0.8 },
      { name: "Chocolate meio amargo (gotas)", qty: 200, unit: "g", costPerUnit: 0.11 },
      { name: "Sal", qty: 5, unit: "g", costPerUnit: 0.02 },
    ],
    totalCost: 30.94,
    costPerUnit: 1.547,
  },
  {
    id: "rec-nino",
    name: "Cookie Niño",
    yield: 18,
    yieldUnit: "un",
    ingredients: [
      { name: "Farinha de trigo", qty: 100, unit: "g", costPerUnit: 0.008 },
      { name: "Manteiga", qty: 100, unit: "g", costPerUnit: 0.04 },
      { name: "Leite Ninho em pó", qty: 100, unit: "g", costPerUnit: 0.06 },
      { name: "Açúcar refinado", qty: 50, unit: "g", costPerUnit: 0.006 },
      { name: "Ovos", qty: 1, unit: "un", costPerUnit: 0.8 },
      { name: "Chocolate branco (gotas)", qty: 150, unit: "g", costPerUnit: 0.05 },
    ],
    totalCost: 19.40,
    costPerUnit: 1.078,
  },
  {
    id: "rec-3choc",
    name: "Cookie 3 Chocolates",
    yield: 18,
    yieldUnit: "un",
    ingredients: [
      { name: "Farinha de trigo", qty: 220, unit: "g", costPerUnit: 0.008 },
      { name: "Manteiga", qty: 150, unit: "g", costPerUnit: 0.04 },
      { name: "Açúcar mascavo", qty: 80, unit: "g", costPerUnit: 0.01 },
      { name: "Ovos", qty: 1, unit: "un", costPerUnit: 0.8 },
      { name: "Mix chocolate branco/meio amargo/ao leite", qty: 210, unit: "g", costPerUnit: 0.047 },
      { name: "Chocolate meio amargo (cobertura)", qty: 40, unit: "g", costPerUnit: 0.045 },
    ],
    totalCost: 21.03,
    costPerUnit: 1.168,
  },
];

export const priceTiers = [
  { id: "tier-1", name: "Assado 1un", minQty: 1, maxQty: 2, price: 15, type: "assado" },
  { id: "tier-2", name: "Assado 3un", minQty: 3, maxQty: 9, price: 13, type: "assado" },
  { id: "tier-3", name: "Assado 10un", minQty: 10, maxQty: null, price: 10, type: "assado" },
  { id: "tier-4", name: "Congelado 4un", minQty: 4, maxQty: 4, price: 10, type: "congelado" },
  { id: "tier-5", name: "Congelado 6un", minQty: 6, maxQty: 6, price: 9, type: "congelado" },
  { id: "tier-6", name: "Congelado 8un", minQty: 8, maxQty: 8, price: 8.75, type: "congelado" },
];

export const kpiData = {
  revenue: { value: 450, change: 0 },
  profit: { value: 130, change: 0 },
  margin: { value: 28.9, change: 0 },
  ordersToday: { value: 2, pending: 0 },
};

export const monthlyRevenue = [
  { month: "Jul", revenue: 450, cost: 320, profit: 130 },
];

export const channelDistribution = [
  { name: "WhatsApp", value: 50, color: "#2F7A3E" },
  { name: "iFood", value: 30, color: "#C23B2E" },
  { name: "Direto", value: 20, color: "#111111" },
];
