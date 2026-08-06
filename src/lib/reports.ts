export const REPORT_PERIODS = [
  { key: "diario", label: "Diário", days: 1 },
  { key: "semanal", label: "Semanal", days: 7 },
  { key: "mensal", label: "Mensal", days: 30 },
  { key: "trimestral", label: "Trimestral", days: 90 },
  { key: "semestral", label: "Semestral", days: 180 },
  { key: "anual", label: "Anual", days: 365 },
  { key: "tudo", label: "Todo o período", days: 0 },
] as const

export type ReportPeriod = (typeof REPORT_PERIODS)[number]

export interface ReportSale {
  id: string
  total?: number
  createdAt: string
  channel?: { name?: string } | string | null
  channelId?: string
  channelName?: string
  items?: Array<{
    qty: number
    price: number
    product?: { name?: string } | null
    productName?: string | null
  }>
}

export interface ReportOrder {
  id: string
  createdAt: string
  status: string
  total?: number
  platform?: string | null
  platformFee?: number | null
}

export interface ReportDeliveryCost {
  id: string
  date: string
  amount: number
}

export interface ReportChannel {
  id: string
  name: string
}

export const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  CONFIRMADO: "Confirmado",
  PRODUCAO: "Produção",
  PRONTO: "Pronto",
  ENTREGA: "Entrega",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
}

export function startOfLocalDay(daysAgo = 0): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return d.getTime()
}

function localDayStart(iso: string): number {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return NaN
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function formatDate(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
}

export function periodRangeLabel(days: number): string {
  if (!days) return "Todo o período"
  const from = formatDate(startOfLocalDay(days - 1))
  const to = formatDate(startOfLocalDay(0))
  return `${from} a ${to}`
}

export function filterByCreatedAt<T extends { createdAt: string }>(rows: T[], days: number): T[] {
  if (!days) return rows
  const windowStart = startOfLocalDay(days - 1)
  return rows.filter((r) => {
    const day = localDayStart(r.createdAt)
    return !isNaN(day) && day >= windowStart
  })
}

export function filterByDate<T extends { date: string }>(rows: T[], days: number): T[] {
  if (!days) return rows
  const windowStart = startOfLocalDay(days - 1)
  return rows.filter((r) => {
    const day = localDayStart(r.date)
    return !isNaN(day) && day >= windowStart
  })
}

export function totalRevenue(sales: ReportSale[]): number {
  return sales.reduce((sum, s) => sum + (s.total || 0), 0)
}

export function averageTicket(sales: ReportSale[]): number {
  return sales.length > 0 ? totalRevenue(sales) / sales.length : 0
}

export function activeOrderCount(orders: ReportOrder[]): number {
  return orders.filter((o) => o.status !== "CANCELADO").length
}

export function channelNameOf(sale: ReportSale, channels: ReportChannel[]): string {
  const embedded =
    typeof sale.channel === "object" && sale.channel
      ? sale.channel.name
      : typeof sale.channel === "string"
        ? sale.channel
        : undefined
  return embedded || sale.channelName || channels.find((c) => c.id === sale.channelId)?.name || "Direto"
}

export function channelBreakdown(
  sales: ReportSale[],
  channels: ReportChannel[],
): { name: string; count: number; percent: number }[] {
  const counts: Record<string, number> = {}
  sales.forEach((s) => {
    const name = channelNameOf(s, channels)
    counts[name] = (counts[name] || 0) + 1
  })
  const total = sales.length
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count, percent: total ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
}

export function topProducts(sales: ReportSale[], limit = 5): { name: string; sold: number; revenue: number }[] {
  const acc: Record<string, { sold: number; revenue: number }> = {}
  sales.forEach((s) => {
    ;(s.items || []).forEach((item) => {
      const name = item.product?.name || item.productName || "Produto"
      if (!acc[name]) acc[name] = { sold: 0, revenue: 0 }
      acc[name].sold += item.qty || 0
      acc[name].revenue += (item.qty || 0) * (item.price || 0)
    })
  })
  return Object.entries(acc)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

export function statusBreakdown(orders: ReportOrder[]): { status: string; label: string; count: number }[] {
  const counts: Record<string, number> = {}
  orders.forEach((o) => {
    counts[o.status] = (counts[o.status] || 0) + 1
  })
  return Object.entries(counts)
    .map(([status, count]) => ({ status, label: STATUS_LABELS[status] || status, count }))
    .sort((a, b) => b.count - a.count)
}

export function deliverySummary(orders: ReportOrder[], costs: ReportDeliveryCost[]) {
  const delivery = orders.filter((o) => o.platform && o.status === "CONCLUIDO")
  const revenue = delivery.reduce((sum, o) => sum + (o.total || 0) - (o.platformFee || 0), 0)
  const fees = delivery.reduce((sum, o) => sum + (o.platformFee || 0), 0)
  const costTotal = costs.reduce((sum, c) => sum + (c.amount || 0), 0)
  return { count: delivery.length, revenue, fees, costs: costTotal, net: revenue - costTotal }
}

export type TimeGranularity = "hour" | "day" | "week" | "month"

export function timeGranularity(days: number): TimeGranularity {
  if (days === 1) return "hour"
  if (days === 0) return "month"
  if (days <= 31) return "day"
  if (days <= 92) return "week"
  return "month"
}

interface TimeBucket {
  name: string
  total: number
  start: number
  end: number
}

function buildHourBuckets(): TimeBucket[] {
  const now = new Date()
  const buckets: TimeBucket[] = []
  for (let h = 0; h < 24; h++) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0, 0).getTime()
    buckets.push({ name: `${String(h).padStart(2, "0")}h`, total: 0, start, end: start + 3_600_000 })
  }
  return buckets
}

function buildDayBuckets(days: number): TimeBucket[] {
  const buckets: TimeBucket[] = []
  for (let i = 0; i < days; i++) {
    const start = startOfLocalDay(days - 1 - i)
    const end = i === days - 1 ? startOfLocalDay(-1) : startOfLocalDay(days - 2 - i)
    buckets.push({ name: formatDate(start).slice(0, 5), total: 0, start, end })
  }
  return buckets
}

function buildWeekBuckets(days: number): TimeBucket[] {
  const count = Math.ceil(days / 7)
  const buckets: TimeBucket[] = []
  for (let i = 0; i < count; i++) {
    const start = startOfLocalDay(days - 1 - i * 7)
    const end = i === count - 1 ? startOfLocalDay(-1) : startOfLocalDay(days - 1 - (i + 1) * 7)
    buckets.push({ name: formatDate(start).slice(0, 5), total: 0, start, end })
  }
  return buckets
}

function buildMonthBuckets(days: number): TimeBucket[] {
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth()
  const ws = new Date(startOfLocalDay(days - 1))
  let year = ws.getFullYear()
  let month = ws.getMonth()
  const buckets: TimeBucket[] = []
  while (year < curYear || (year === curYear && month <= curMonth)) {
    const start = new Date(year, month, 1, 0, 0, 0, 0).getTime()
    const end = new Date(year, month + 1, 1, 0, 0, 0, 0).getTime()
    const label =
      days >= 365
        ? `${String(month + 1).padStart(2, "0")}/${year}`
        : `${String(month + 1).padStart(2, "0")}/${String(year).slice(2)}`
    buckets.push({ name: label, total: 0, start, end })
    month++
    if (month > 11) {
      month = 0
      year++
    }
  }
  return buckets
}

function buildMonthBucketsFromData(sales: ReportSale[]): TimeBucket[] {
  if (!sales.length) return []
  let min = Infinity
  let max = -Infinity
  sales.forEach((s) => {
    const d = new Date(s.createdAt)
    if (isNaN(d.getTime())) return
    const k = d.getFullYear() * 12 + d.getMonth()
    min = Math.min(min, k)
    max = Math.max(max, k)
  })
  if (min === Infinity) return []
  const buckets: TimeBucket[] = []
  for (let k = min; k <= max; k++) {
    const year = Math.floor(k / 12)
    const month = k % 12
    const start = new Date(year, month, 1, 0, 0, 0, 0).getTime()
    const end = new Date(year, month + 1, 1, 0, 0, 0, 0).getTime()
    buckets.push({ name: `${String(month + 1).padStart(2, "0")}/${year}`, total: 0, start, end })
  }
  return buckets
}

function assignToBucket(buckets: TimeBucket[], iso: string, value: number) {
  if (!value) return
  const day = localDayStart(iso)
  if (isNaN(day)) return
  for (const bucket of buckets) {
    if (day >= bucket.start && day < bucket.end) {
      bucket.total += value
      return
    }
  }
}

function assignHour(sale: ReportSale, buckets: TimeBucket[]) {
  const d = new Date(sale.createdAt)
  if (isNaN(d.getTime())) return
  const now = new Date()
  if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth() || d.getDate() !== now.getDate()) return
  const h = d.getHours()
  if (h >= 0 && h < buckets.length) buckets[h].total += sale.total || 0
}

export function salesOverTime(sales: ReportSale[], days: number): { name: string; total: number }[] {
  const gran = timeGranularity(days)

  if (gran === "hour") {
    const buckets = buildHourBuckets()
    sales.forEach((s) => assignHour(s, buckets))
    return buckets.map((b) => ({ name: b.name, total: b.total }))
  }

  if (gran === "day") {
    const buckets = buildDayBuckets(days)
    sales.forEach((s) => assignToBucket(buckets, s.createdAt, s.total || 0))
    return buckets.map((b) => ({ name: b.name, total: b.total }))
  }

  if (gran === "week") {
    const buckets = buildWeekBuckets(days)
    sales.forEach((s) => assignToBucket(buckets, s.createdAt, s.total || 0))
    return buckets.map((b) => ({ name: b.name, total: b.total }))
  }

  const buckets = days ? buildMonthBuckets(days) : buildMonthBucketsFromData(sales)
  sales.forEach((s) => assignToBucket(buckets, s.createdAt, s.total || 0))
  return buckets.map((b) => ({ name: b.name, total: b.total }))
}

export interface ReportSummary {
  periodKey: string
  periodLabel: string
  periodDays: number
  rangeLabel: string
  generatedAt: string
  revenue: number
  saleCount: number
  orderCount: number
  averageTicket: number
  channels: { name: string; count: number; percent: number }[]
  topProducts: { name: string; sold: number; revenue: number }[]
  statuses: { status: string; label: string; count: number }[]
  delivery: { count: number; revenue: number; fees: number; costs: number; net: number }
  overTime: { name: string; total: number }[]
}

export function buildReportSummary(
  sales: ReportSale[],
  orders: ReportOrder[],
  deliveryCosts: ReportDeliveryCost[],
  channels: ReportChannel[],
  period: ReportPeriod,
): ReportSummary {
  const filteredSales = filterByCreatedAt(sales, period.days)
  const filteredOrders = filterByCreatedAt(orders, period.days)
  const filteredCosts = filterByDate(deliveryCosts, period.days)

  return {
    periodKey: period.key,
    periodLabel: period.label,
    periodDays: period.days,
    rangeLabel: periodRangeLabel(period.days),
    generatedAt: new Date().toLocaleString("pt-BR"),
    revenue: totalRevenue(filteredSales),
    saleCount: filteredSales.length,
    orderCount: activeOrderCount(filteredOrders),
    averageTicket: averageTicket(filteredSales),
    channels: channelBreakdown(filteredSales, channels),
    topProducts: topProducts(filteredSales),
    statuses: statusBreakdown(filteredOrders),
    delivery: deliverySummary(filteredOrders, filteredCosts),
    overTime: salesOverTime(filteredSales, period.days),
  }
}
