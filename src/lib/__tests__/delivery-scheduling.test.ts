import { describe, it, expect } from "vitest"
import {
  weekdayOf,
  todayKey,
  shiftDateKey,
  cutoffAtFor,
  cutoffLabelFor,
  dateLabelFor,
  generateRouteDates,
  buildSlots,
  usageKey,
  windowLabelFor,
  type DeliveryRouteInput,
} from "@/lib/delivery-scheduling"

function route(overrides: Partial<DeliveryRouteInput> = {}): DeliveryRouteInput {
  return {
    id: "r1",
    name: "Rota Terça",
    zoneId: "z1",
    recurring: true,
    dayOfWeek: 2,
    date: null,
    startDate: null,
    endDate: null,
    cutoffTime: "18:00",
    cutoffOffsetDays: 1,
    windowStart: "12:00",
    windowEnd: "18:00",
    capacityEnabled: false,
    maxOrders: null,
    maxItems: null,
    active: true,
    ...overrides,
  }
}

describe("datas no fuso America/Sao_Paulo", () => {
  it("todayKey usa o dia local de SP", () => {
    // 03/08 20:00Z = 17:00 em SP -> ainda segunda
    expect(todayKey(new Date("2026-08-03T20:00:00Z"))).toBe("2026-08-03")
    // 04/08 00:30Z = 21:30 de 03/08 em SP -> ainda segunda
    expect(todayKey(new Date("2026-08-04T00:30:00Z"))).toBe("2026-08-03")
    // 04/08 03:00Z = 00:00 de 04/08 em SP -> terça
    expect(todayKey(new Date("2026-08-04T03:00:00Z"))).toBe("2026-08-04")
  })

  it("weekdayOf retorna 1..7 (seg=1, dom=7)", () => {
    expect(weekdayOf("2026-08-03")).toBe(1) // segunda
    expect(weekdayOf("2026-08-04")).toBe(2) // terça
    expect(weekdayOf("2026-08-09")).toBe(7) // domingo
  })

  it("shiftDateKey atravessa meses e anos", () => {
    expect(shiftDateKey("2026-08-01", -1)).toBe("2026-07-31")
    expect(shiftDateKey("2026-01-01", -1)).toBe("2025-12-31")
    expect(shiftDateKey("2026-08-03", 1)).toBe("2026-08-04")
  })
})

describe("cutoff", () => {
  it("18h do dia anterior, em SP (UTC-3)", () => {
    const cutoff = cutoffAtFor(route(), "2026-08-04")
    expect(cutoff.toISOString()).toBe("2026-08-03T21:00:00.000Z")
  })

  it("rótulo do cutoff indica o dia e hora corretos", () => {
    expect(cutoffLabelFor(route(), "2026-08-04")).toBe("Segunda-feira, 18h")
    expect(cutoffLabelFor({ cutoffTime: "18:30", cutoffOffsetDays: 2 }, "2026-08-07")).toBe("Quarta-feira, 18h30")
  })

  it("rótulo curto da data", () => {
    expect(dateLabelFor("2026-08-04")).toBe("Ter, 04/08")
  })

  it("rótulo da janela de entrega (12h-18h)", () => {
    expect(windowLabelFor(route())).toBe("Entrega entre 12h e 18h")
    expect(windowLabelFor({ windowStart: "13:30", windowEnd: "17:45" })).toBe("Entrega entre 13h30 e 17h45")
  })
})

describe("geração de datas das rotas", () => {
  it("rota recorrente semanal gera só o dia da semana", () => {
    const dates = generateRouteDates(route({ dayOfWeek: 2 }), "2026-08-03", 4)
    expect(dates).toEqual(["2026-08-04", "2026-08-11", "2026-08-18", "2026-08-25"])
  })

  it("respeita janela start/end", () => {
    const dates = generateRouteDates(
      route({ dayOfWeek: 5, startDate: "2026-08-10", endDate: "2026-08-14" }),
      "2026-08-01",
      10,
    )
    expect(dates).toEqual(["2026-08-14"])
  })

  it("rota extraordinária usa data fixa", () => {
    const dates = generateRouteDates(
      route({ recurring: false, dayOfWeek: null, date: "2026-09-07" }),
      "2026-08-01",
      5,
    )
    expect(dates).toEqual(["2026-09-07"])
  })

  it("rota extraordinária já passada não aparece", () => {
    const dates = generateRouteDates(
      route({ recurring: false, dayOfWeek: null, date: "2026-07-01" }),
      "2026-08-01",
      5,
    )
    expect(dates).toEqual([])
  })
})

describe("buildSlots", () => {
  const now = new Date("2026-08-03T12:00:00Z") // 09:00 em SP, segunda

  it("retorna só opções abertas, sem datas bloqueadas", () => {
    const slots = buildSlots({
      routes: [
        { ...route(), id: "tue", name: "Terça", dayOfWeek: 2, zoneName: "SP" },
        { ...route(), id: "fri", name: "Sexta", dayOfWeek: 5, zoneName: "SP" },
      ],
      blocked: [{ zoneId: "z1", date: "2026-08-07" }], // sexta bloqueada
      usage: new Map(),
      now,
    })
    const dates = slots.map((s) => s.date)
    expect(dates).toContain("2026-08-04") // terça aberta
    expect(dates).not.toContain("2026-08-07") // sexta bloqueada
    expect(slots.every((s) => s.open)).toBe(true)
  })

  it("rota fechada após o cutoff não aparece", () => {
    const late = new Date("2026-08-03T22:00:00Z") // 19:00 SP, segunda
    const slots = buildSlots({
      routes: [{ ...route(), id: "tue", name: "Terça", dayOfWeek: 2, zoneName: "SP" }],
      blocked: [],
      usage: new Map(),
      now: late,
    })
    expect(slots.some((s) => s.date === "2026-08-04")).toBe(false)
  })

  it("preenche capacidade utilizada por (rota, data)", () => {
    const usage = new Map()
    usage.set(usageKey("tue", "2026-08-04"), { orders: 3, items: 24 })
    const slots = buildSlots({
      routes: [{ ...route(), id: "tue", name: "Terça", dayOfWeek: 2, zoneName: "SP", capacityEnabled: true, maxOrders: 10, maxItems: 100 }],
      blocked: [],
      usage,
      now,
    })
    const tue = slots.find((s) => s.date === "2026-08-04")
    expect(tue?.capacity).toMatchObject({ enabled: true, maxOrders: 10, maxItems: 100, usedOrders: 3, usedItems: 24 })
  })

  it("expõe a janela de entrega no slot", () => {
    const slots = buildSlots({
      routes: [{ ...route(), id: "tue", name: "Terça", dayOfWeek: 2, zoneName: "SP", windowStart: "12:00", windowEnd: "18:00" }],
      blocked: [],
      usage: new Map(),
      now,
    })
    const tue = slots.find((s) => s.date === "2026-08-04")
    expect(tue?.windowStart).toBe("12:00")
    expect(tue?.windowEnd).toBe("18:00")
    expect(tue?.windowLabel).toBe("Entrega entre 12h e 18h")
  })
})
