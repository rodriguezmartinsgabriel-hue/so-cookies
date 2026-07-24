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
  stockKg: number;
  minStockKg: number;
  costPerKg: number;
  supplier: string;
  lastPurchase?: string;
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
  ingredients: { name: string; qty: number; unit: string }[];
  totalCost: number;
};

export const channels: SaleChannel[] = [
  { id: "whatsapp", name: "WhatsApp", commission: 0 },
  { id: "ifood", name: "iFood", commission: 0.23 },
  { id: "rappi", name: "Rappi", commission: 0.20 },
  { id: "direto", name: "Direto", commission: 0 },
];

export const products: Product[] = [
  { id: "1", name: "Cookie Clássico", sku: "CK-001", category: "Cookie", price: 12, cost: 3.50, margin: 70.8, unit: "un", active: true },
  { id: "2", name: "Cookie Chocolate Belga", sku: "CK-002", category: "Cookie", price: 14, cost: 4.20, margin: 70.0, unit: "un", active: true },
  { id: "3", name: "Cookie Red Velvet", sku: "CK-003", category: "Cookie", price: 15, cost: 4.80, margin: 68.0, unit: "un", active: true },
  { id: "4", name: "Cookie Nutella", sku: "CK-004", category: "Cookie", price: 16, cost: 5.50, margin: 65.6, unit: "un", active: true },
  { id: "5", name: "Cookie Vegano", sku: "CK-005", category: "Cookie", price: 14, cost: 4.00, margin: 71.4, unit: "un", active: true },
  { id: "6", name: "Brownie Clássico", sku: "BR-001", category: "Brownie", price: 10, cost: 2.80, margin: 72.0, unit: "un", active: true },
  { id: "7", name: "Brownie Cremoso", sku: "BR-002", category: "Brownie", price: 12, cost: 3.60, margin: 70.0, unit: "un", active: true },
  { id: "8", name: "Combo Cookie + Café", sku: "CB-001", category: "Cookie", price: 18, cost: 5.00, margin: 72.2, unit: "combo", active: true },
  { id: "9", name: "Café Expresso", sku: "CF-001", category: "Café", price: 6, cost: 0.80, margin: 86.7, unit: "un", active: true },
  { id: "10", name: "Café com Leite", sku: "CF-002", category: "Café", price: 8, cost: 1.50, margin: 81.3, unit: "un", active: true },
  { id: "11", name: "Cold Brew", sku: "CF-003", category: "Bebida", price: 12, cost: 2.00, margin: 83.3, unit: "un", active: true },
];

export const ingredients: Ingredient[] = [
  { id: "1", name: "Farinha de Trigo", stockKg: 15, minStockKg: 5, costPerKg: 6.50, supplier: "Forno & Cia" },
  { id: "2", name: "Manteiga", stockKg: 8, minStockKg: 3, costPerKg: 28.00, supplier: "Laticínios Sul" },
  { id: "3", name: "Açúcar Cristal", stockKg: 12, minStockKg: 4, costPerKg: 5.20, supplier: "Açúcar Bom" },
  { id: "4", name: "Chocolate em Pó", stockKg: 4, minStockKg: 2, costPerKg: 22.00, supplier: "Cacau Show" },
  { id: "5", name: "Chocolate Belga", stockKg: 3, minStockKg: 2, costPerKg: 55.00, supplier: "Callebaut" },
  { id: "6", name: "Ovos", stockKg: 6, minStockKg: 3, costPerKg: 18.00, supplier: "Granja Modelo" },
  { id: "7", name: "Nutella", stockKg: 2, minStockKg: 1, costPerKg: 60.00, supplier: "Ferrero" },
  { id: "8", name: "Café em Grãos", stockKg: 5, minStockKg: 2, costPerKg: 45.00, supplier: "Café do Campo" },
  { id: "9", name: "Leite", stockKg: 10, minStockKg: 5, costPerKg: 5.50, supplier: "Laticínios Sul" },
  { id: "10", name: "Fermento", stockKg: 1, minStockKg: 0.5, costPerKg: 15.00, supplier: "Forno & Cia" },
  { id: "11", name: "Aveia", stockKg: 3, minStockKg: 1, costPerKg: 12.00, supplier: "Natural Way" },
];

export const orders: Order[] = [
  { id: "001", channel: "iFood", customer: "Maria Silva", items: [{ product: "Cookie Chocolate Belga", qty: 4, price: 14 }, { product: "Café Expresso", qty: 2, price: 6 }], total: 68, status: "pendente", createdAt: "10:30" },
  { id: "002", channel: "WhatsApp", customer: "João Santos", items: [{ product: "Cookie Clássico", qty: 6, price: 12 }, { product: "Brownie Clássico", qty: 3, price: 10 }], total: 102, status: "confirmado", createdAt: "10:45" },
  { id: "003", channel: "Rappi", customer: "Ana Costa", items: [{ product: "Combo Cookie + Café", qty: 2, price: 18 }, { product: "Cold Brew", qty: 1, price: 12 }], total: 48, status: "producao", createdAt: "11:00" },
  { id: "004", channel: "Direto", customer: "Pedro Lima", items: [{ product: "Cookie Nutella", qty: 12, price: 16 }], total: 192, status: "pronto", createdAt: "09:30" },
  { id: "005", channel: "iFood", customer: "Lucia Ferreira", items: [{ product: "Cookie Vegano", qty: 3, price: 14 }, { product: "Café com Leite", qty: 2, price: 8 }], total: 58, status: "entrega", createdAt: "11:15" },
  { id: "006", channel: "WhatsApp", customer: "Carlos Souza", items: [{ product: "Brownie Cremoso", qty: 5, price: 12 }], total: 60, status: "concluido", createdAt: "08:00" },
  { id: "007", channel: "Direto", customer: "Fernanda Alves", items: [{ product: "Cookie Red Velvet", qty: 8, price: 15 }], total: 120, status: "concluido", createdAt: "08:30" },
];

export const cashFlow: CashFlowEntry[] = [
  { id: "1", type: "Entrada", category: "Venda Direta", description: "Pedido #004 - Pedro Lima", amount: 192, date: "Hoje" },
  { id: "2", type: "Entrada", category: "Venda iFood", description: "3 pedidos iFood", amount: 156, date: "Hoje" },
  { id: "3", type: "Entrada", category: "Venda Rappi", description: "1 pedido Rappi", amount: 48, date: "Hoje" },
  { id: "4", type: "Saída", category: "Compra Ingrediente", description: "Chocolate Belga - Callebaut", amount: -165, date: "Hoje" },
  { id: "5", type: "Saída", category: "Frete", description: "Entrega Rappi", amount: -25, date: "Hoje" },
  { id: "6", type: "Entrada", category: "Venda WhatsApp", description: "2 pedidos WhatsApp", amount: 204, date: "Ontem" },
  { id: "7", type: "Saída", category: "Comissão iFood", description: "Comissão sobre vendas", amount: -72.50, date: "Ontem" },
  { id: "8", type: "Saída", category: "Compra Ingrediente", description: "Farinha + Manteiga", amount: -98, date: "Ontem" },
];

export const recipes: Recipe[] = [
  {
    id: "1",
    name: "Cookie Clássico",
    yield: 12,
    yieldUnit: "un",
    ingredients: [
      { name: "Farinha de Trigo", qty: 0.25, unit: "kg" },
      { name: "Manteiga", qty: 0.125, unit: "kg" },
      { name: "Açúcar Cristal", qty: 0.1, unit: "kg" },
      { name: "Ovos", qty: 0.05, unit: "kg" },
      { name: "Fermento", qty: 0.01, unit: "kg" },
    ],
    totalCost: 3.50,
  },
  {
    id: "2",
    name: "Cookie Chocolate Belga",
    yield: 12,
    yieldUnit: "un",
    ingredients: [
      { name: "Farinha de Trigo", qty: 0.22, unit: "kg" },
      { name: "Manteiga", qty: 0.12, unit: "kg" },
      { name: "Açúcar Cristal", qty: 0.09, unit: "kg" },
      { name: "Chocolate Belga", qty: 0.05, unit: "kg" },
      { name: "Ovos", qty: 0.05, unit: "kg" },
      { name: "Fermento", qty: 0.01, unit: "kg" },
    ],
    totalCost: 4.20,
  },
  {
    id: "3",
    name: "Brownie Clássico",
    yield: 16,
    yieldUnit: "un",
    ingredients: [
      { name: "Chocolate em Pó", qty: 0.2, unit: "kg" },
      { name: "Manteiga", qty: 0.15, unit: "kg" },
      { name: "Açúcar Cristal", qty: 0.2, unit: "kg" },
      { name: "Ovos", qty: 0.15, unit: "kg" },
      { name: "Farinha de Trigo", qty: 0.1, unit: "kg" },
    ],
    totalCost: 2.80,
  },
];

export const kpiData = {
  revenue: { value: 1250, change: 12 },
  profit: { value: 380, change: 8 },
  margin: { value: 30.4, change: 2 },
  ordersToday: { value: 8, pending: 2 },
};

export const monthlyRevenue = [
  { month: "Jul", revenue: 1250, cost: 870, profit: 380 },
];

export const channelDistribution = [
  { name: "iFood", value: 35, color: "#C23B2E" },
  { name: "Rappi", value: 25, color: "#E0A400" },
  { name: "WhatsApp", value: 25, color: "#2F7A3E" },
  { name: "Direto", value: 15, color: "#111111" },
];
