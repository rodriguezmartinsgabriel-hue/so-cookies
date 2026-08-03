import { describe, it, expect } from "vitest"
import {
  REPORT_PERIODS,
  buildReportSummary,
  filterByCreatedAt,
  filterByDate,
  salesOverTime,
  channelBreakdown,
  channelNameOf,
  topProducts,
  statusBreakdown,
  activeOrderCount,
  deliverySummary,
  totalRevenue,
  averageTicket,
  timeGranularity,
  periodRangeLabel,
  type ReportSale,
  type ReportOrder,
  type ReportDeliveryCost,
  type ReportChannel,
} from "@/lib/reports"

function iso(daysAgo: number, hour = 12): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const periods = Object.fromEntries(REPORT_PERIODS.map((p) => [p.key, p]))

function sale(partial: Partial<ReportSale> & { createdAt: string }): ReportSale {
  return { id: partial.id || "s1", total: 0, ...partial, createdAt: partial.createdAt }
}

function order(partial: Partial<ReportOrder> & { createdAt: string }): ReportOrder {
  return { id: partial.id || "o1", status: "CONCLUIDO", ...partial, createdAt: partial.createdAt }
}

describe("filterByCreatedAt / filterByDate", () => {
  it("inclui vendas de hoje e do início da janela, exclui as antigas", () => {
    const rows = [
      { id: "a", createdAt: iso(0) },
      { id: "b", createdAt: iso(29) },
      { id: "c", createdAt: iso(31) },
    ]
    const filtered = filterByCreatedAt(rows, 30)
    expect(filtered.map((r) => r.id)).toEqual(["a", "b"])
  })

  it("com days=0 não filtra (todo o período)", () => {
    const rows = [{ id: "a", createdAt: iso(400) }]
    expect(filterByCreatedAt(rows, 0)).toHaveLength(1)
    expect(filterByDate([{ id: "a", date: iso(400) }], 0)).toHaveLength(1)
  })
})

describe("salesOverTime", () => {
  it("período de 7 dias: venda de HOJE aparece no último bucket (regressão do índice)", () => {
    const today = sale({ id: "t", total: 100, createdAt: iso(0, 14) })
    const yesterday = sale({ id: "y", total: 50, createdAt: iso(1, 14) })
    const old = sale({ id: "o", total: 999, createdAt: iso(8, 14) })
    const series = salesOverTime([today, yesterday, old], 7)
    expect(series).toHaveLength(7)
    expect(series[series.length - 1].total).toBe(100)
    expect(series.reduce((s, b) => s + b.total, 0)).toBe(150)
  })

  it("soma dos buckets diários equivale à receita filtrada", () => {
    const rows = [sale({ total: 10, createdAt: iso(0) }), sale({ total: 20, createdAt: iso(5) }), sale({ total: 30, createdAt: iso(20) }), sale({ total: 999, createdAt: iso(31) })]
    const series = salesOverTime(rows, 30)
    expect(series).toHaveLength(30)
    expect(series.reduce((s, b) => s + b.total, 0)).toBe(60)
  })

  it("período diário gera 24 buckets por hora e atribui a venda de hoje à hora correta", () => {
    const now = new Date()
    const h = 9
    const d = new Date()
    d.setHours(h, 0, 0, 0)
    const series = salesOverTime([sale({ total: 42, createdAt: d.toISOString() })], 1)
    expect(series).toHaveLength(24)
    expect(series[h].total).toBe(42)
    expect(series[h].name).toBe("09h")
    void now
  })

  it("período trimestral gera buckets semanais e soma corretamente", () => {
    const rows = [sale({ total: 10, createdAt: iso(0) }), sale({ total: 20, createdAt: iso(60) }), sale({ total: 999, createdAt: iso(100) })]
    const series = salesOverTime(rows, 90)
    expect(series).toHaveLength(13)
    expect(series.reduce((s, b) => s + b.total, 0)).toBe(30)
  })

  it("período anual gera buckets mensais", () => {
    const series = salesOverTime([sale({ total: 10, createdAt: iso(0) })], 365)
    expect(series.length).toBeGreaterThanOrEqual(12)
    expect(series.length).toBeLessThanOrEqual(13)
    expect(series.reduce((s, b) => s + b.total, 0)).toBe(10)
  })

  it("todo o período gera buckets mensais apenas dos meses com dados", () => {
    const rows = [sale({ total: 10, createdAt: iso(0) }), sale({ total: 20, createdAt: iso(120) })]
    const series = salesOverTime(rows, 0)
    expect(series.length).toBeGreaterThanOrEqual(4)
    expect(series.reduce((s, b) => s + b.total, 0)).toBe(30)
  })

  it("granularidade correta por período", () => {
    expect(timeGranularity(1)).toBe("hour")
    expect(timeGranularity(7)).toBe("day")
    expect(timeGranularity(30)).toBe("day")
    expect(timeGranularity(90)).toBe("week")
    expect(timeGranularity(180)).toBe("month")
    expect(timeGranularity(365)).toBe("month")
    expect(timeGranularity(0)).toBe("month")
  })
})

describe("canal", () => {
  const channels: ReportChannel[] = [
    { id: "ch-wpp", name: "WhatsApp" },
    { id: "ch-dir", name: "Direto" },
  ]

  it("prioriza canal embutido (servidor)", () => {
    expect(channelNameOf({ id: "s", channel: { name: "iFood" }, createdAt: iso(0) }, channels)).toBe("iFood")
    expect(channelNameOf({ id: "s", channel: "Rappi", createdAt: iso(0) }, channels)).toBe("Rappi")
  })

  it("cai para channelName (venda offline)", () => {
    expect(channelNameOf({ id: "s", channelName: "WhatsApp", createdAt: iso(0) }, channels)).toBe("WhatsApp")
  })

  it("cai para canais por channelId", () => {
    expect(channelNameOf({ id: "s", channelId: "ch-wpp", createdAt: iso(0) }, channels)).toBe("WhatsApp")
  })

  it("padrão Direto e distribuição em percentuais", () => {
    const sales = [
      sale({ id: "a", channel: { name: "WhatsApp" }, total: 1, createdAt: iso(0) }),
      sale({ id: "b", channel: { name: "WhatsApp" }, total: 1, createdAt: iso(0) }),
      sale({ id: "c", channel: { name: "iFood" }, total: 1, createdAt: iso(0) }),
      sale({ id: "d", channelId: "desconhecido", total: 1, createdAt: iso(0) }),
    ]
    const breakdown = channelBreakdown(sales, channels)
    expect(breakdown[0]).toEqual({ name: "WhatsApp", count: 2, percent: 50 })
    expect(breakdown.map((b) => b.name)).toContain("Direto")
  })
})

describe("topProducts", () => {
  it("agrega itens embutidos do servidor e nomes de produto offline", () => {
    const sales: ReportSale[] = [
      {
        id: "a",
        total: 10,
        createdAt: iso(0),
        items: [
          { qty: 2, price: 5, product: { name: "Brigadeiro" } },
          { qty: 1, price: 10, product: { name: "Cookie" } },
        ],
      },
      {
        id: "b",
        total: 6,
        createdAt: iso(0),
        items: [{ qty: 1, price: 6, productName: "Brigadeiro" }],
      },
    ]
    const top = topProducts(sales)
    expect(top[0]).toEqual({ name: "Brigadeiro", sold: 3, revenue: 16 })
    expect(top[1].name).toBe("Cookie")
  })

  it("respeita o limite", () => {
    const items = Array.from({ length: 6 }).map((_, i) => ({ qty: 1, price: 1, productName: `Produto ${i}` }))
    const top = topProducts([{ id: "a", total: 6, createdAt: iso(0), items }])
    expect(top).toHaveLength(5)
  })
})

describe("pedidos", () => {
  it("activeOrderCount exclui CANCELADO", () => {
    const rows = [
      order({ id: "a", status: "CONCLUIDO", createdAt: iso(0) }),
      order({ id: "b", status: "PENDENTE", createdAt: iso(0) }),
      order({ id: "c", status: "CANCELADO", createdAt: iso(0) }),
    ]
    expect(activeOrderCount(rows)).toBe(2)
  })

  it("statusBreakdown rotula e ordena por contagem", () => {
    const rows = [
      order({ id: "a", status: "CONCLUIDO", createdAt: iso(0) }),
      order({ id: "b", status: "CONCLUIDO", createdAt: iso(0) }),
      order({ id: "c", status: "CANCELADO", createdAt: iso(0) }),
    ]
    const breakdown = statusBreakdown(rows)
    expect(breakdown[0].label).toBe("Concluído")
    expect(breakdown[0].count).toBe(2)
    expect(breakdown[1].label).toBe("Cancelado")
  })
})

describe("deliverySummary", () => {
  it("calcula receita líquida de taxas e desconta custos de /delivery", () => {
    const orders: ReportOrder[] = [
      order({ id: "a", status: "CONCLUIDO", platform: "IFOOD", total: 100, platformFee: 20, createdAt: iso(0) }),
      order({ id: "b", status: "CONCLUIDO", platform: "99FOOD", total: 50, platformFee: 5, createdAt: iso(0) }),
      order({ id: "c", status: "PENDENTE", platform: "IFOOD", total: 999, platformFee: 0, createdAt: iso(0) }),
      order({ id: "d", status: "CONCLUIDO", total: 999, createdAt: iso(0) }),
    ]
    const costs: ReportDeliveryCost[] = [
      { id: "c1", date: iso(0), amount: 10 },
      { id: "c2", date: iso(0), amount: 5 },
    ]
    const summary = deliverySummary(orders, costs)
    expect(summary.count).toBe(2)
    expect(summary.revenue).toBe(125)
    expect(summary.fees).toBe(25)
    expect(summary.costs).toBe(15)
    expect(summary.net).toBe(110)
  })
})

describe("buildReportSummary", () => {
  it("monta o resumo completo usado pela tela e pelo PDF", () => {
    const sales = [sale({ id: "a", total: 100, channel: { name: "WhatsApp" }, createdAt: iso(0) }), sale({ id: "b", total: 50, channelName: "iFood", createdAt: iso(200) })]
    const orders = [order({ id: "a", status: "CONCLUIDO", createdAt: iso(0) }), order({ id: "b", status: "CANCELADO", createdAt: iso(0) })]
    const costs: ReportDeliveryCost[] = [{ id: "c1", date: iso(0), amount: 7 }]
    const channels: ReportChannel[] = []
    const summary = buildReportSummary(sales, orders, costs, channels, periods.semanal)

    expect(summary.periodKey).toBe("semanal")
    expect(summary.periodLabel).toBe("Semanal")
    expect(summary.revenue).toBe(100)
    expect(summary.saleCount).toBe(1)
    expect(summary.orderCount).toBe(1)
    expect(summary.averageTicket).toBe(100)
    expect(summary.delivery.costs).toBe(7)
    expect(summary.generatedAt.length).toBeGreaterThan(0)
  })

  it("rangeLabel para todo o período", () => {
    expect(periodRangeLabel(0)).toBe("Todo o período")
    expect(periodRangeLabel(7)).toMatch(/\d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}/)
  })

  it("períodos do seletor estão corretos", () => {
    expect(REPORT_PERIODS.map((p) => p.days)).toEqual([1, 7, 30, 90, 180, 365, 0])
  })

  it("funções de receita/ticket", () => {
    const sales = [sale({ id: "a", total: 100, createdAt: iso(0) }), sale({ id: "b", total: 200, createdAt: iso(0) })]
    expect(totalRevenue(sales)).toBe(300)
    expect(averageTicket(sales)).toBe(150)
  })
})
