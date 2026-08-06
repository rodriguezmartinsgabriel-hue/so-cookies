import { prisma } from "./prisma"

/**
 * Motor genérico de agendamento de entregas.
 *
 * Rotas podem ser:
 *  - Recorrentes (recurring = true): repetem toda semana no `dayOfWeek`.
 *  - Extraordinárias (recurring = false): acontecem em uma data fixa (`date`).
 *
 * Datas específicas podem ser bloqueadas por zona (feriados/exceções).
 * Capacidade (pedidos e unidades) é opcional e por (rota, data).
 *
 * Todo cálculo de "hoje", cutoff e rótulos usa o fuso America/Sao_Paulo
 * (UTC-3 fixo, Brasil não usa horário de verão desde 2019).
 */

const SP_OFFSET_MIN = -180 // America/Sao_Paulo = UTC-3

export const WEEKDAY_LONG: Record<number, string> = {
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
  7: "Domingo",
}

export const WEEKDAY_SHORT: Record<number, string> = {
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
  7: "Dom",
}

export interface DeliveryRouteInput {
  id: string
  name: string
  zoneId: string
  recurring: boolean
  dayOfWeek: number | null // 1=seg .. 7=dom
  date: string | null // "YYYY-MM-DD" (rota extraordinária)
  startDate: string | null
  endDate: string | null
  cutoffTime: string // "HH:mm"
  cutoffOffsetDays: number
  windowStart: string // "HH:mm" — início da janela de entrega
  windowEnd: string // "HH:mm" — fim da janela de entrega
  capacityEnabled: boolean
  maxOrders: number | null
  maxItems: number | null
  active: boolean
}

export interface BlockedDateInput {
  zoneId: string
  date: string // "YYYY-MM-DD"
}

export interface RouteUsage {
  orders: number
  items: number
}

export interface DeliverySlot {
  date: string
  routeId: string
  routeName: string
  zoneId: string
  zoneName: string
  weekdayLabel: string
  dateLabel: string
  cutoffAt: string // ISO instant
  cutoffLabel: string
  cutoffOffsetDays: number
  windowStart: string
  windowEnd: string
  windowLabel: string
  open: boolean
  capacity: {
    enabled: boolean
    maxOrders: number | null
    maxItems: number | null
    usedOrders: number
    usedItems: number
  }
}

export interface SpParts {
  y: number
  m: number
  d: number
  hh: number
  mm: number
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

export function toSpParts(d: Date): SpParts {
  const shifted = new Date(d.getTime() + SP_OFFSET_MIN * 60000)
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    hh: shifted.getUTCHours(),
    mm: shifted.getUTCMinutes(),
  }
}

export function fromSpParts(p: SpParts): Date {
  return new Date(Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm) - SP_OFFSET_MIN * 60000)
}

export function dateKey(d: Date | string): string {
  if (typeof d === "string") return d
  return d.toISOString().slice(0, 10)
}

export function todayKey(now: Date = new Date()): string {
  const p = toSpParts(now)
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`
}

export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number)
  const base = Date.UTC(y, m - 1, d) - SP_OFFSET_MIN * 60000
  const target = new Date(base + days * 86400000 + SP_OFFSET_MIN * 60000)
  return dateKey(new Date(target.getTime() - SP_OFFSET_MIN * 60000))
}

export function weekdayOf(key: string): number {
  const [y, m, d] = key.split("-").map(Number)
  const sp = fromSpParts({ y, m, d, hh: 12, mm: 0 })
  const jsDay = sp.getUTCDay() // 0=dom
  return jsDay === 0 ? 7 : jsDay
}

function parseTime(t: string): { hh: number; mm: number } {
  const [hh, mm] = t.split(":").map(Number)
  return { hh: Number.isFinite(hh) ? hh : 18, mm: Number.isFinite(mm) ? mm : 0 }
}

function timeLabel(t: string): string {
  const { hh, mm } = parseTime(t)
  return mm === 0 ? `${hh}h` : `${hh}h${pad(mm)}`
}

export function cutoffAtFor(route: Pick<DeliveryRouteInput, "cutoffTime" | "cutoffOffsetDays">, dateKey: string): Date {
  const { hh, mm } = parseTime(route.cutoffTime)
  const [y, m, d] = shiftDateKey(dateKey, -route.cutoffOffsetDays).split("-").map(Number)
  return fromSpParts({ y, m, d, hh, mm })
}

export function cutoffLabelFor(
  route: Pick<DeliveryRouteInput, "cutoffTime" | "cutoffOffsetDays">,
  dateKey: string,
): string {
  const cutoffKey = shiftDateKey(dateKey, -route.cutoffOffsetDays)
  return `${WEEKDAY_LONG[weekdayOf(cutoffKey)]}, ${timeLabel(route.cutoffTime)}`
}

export function windowLabelFor(route: Pick<DeliveryRouteInput, "windowStart" | "windowEnd">): string {
  return `Entrega entre ${timeLabel(route.windowStart)} e ${timeLabel(route.windowEnd)}`
}

export function dateLabelFor(key: string): string {
  const [, m, d] = key.split("-").map(Number)
  return `${WEEKDAY_SHORT[weekdayOf(key)]}, ${pad(d)}/${pad(m)}`
}

/**
 * Gera as próximas datas concretas de uma rota a partir de `fromKey`
 * (inclusive). Respeita recorrência, janela (start/end) e datas fixas.
 */
export function generateRouteDates(route: DeliveryRouteInput, fromKey: string, maxCount: number): string[] {
  const out: string[] = []
  if (!route.active) return out

  if (!route.recurring) {
    if (route.date && route.date >= fromKey) out.push(route.date)
    return out
  }

  const day = route.dayOfWeek ?? 0
  let cursor = fromKey
  let guard = 0
  while (out.length < maxCount && guard < maxCount * 10 + 90) {
    guard++
    if (cursor < fromKey) {
      cursor = shiftDateKey(cursor, 1)
      continue
    }
    if (route.startDate && cursor < route.startDate) {
      cursor = shiftDateKey(cursor, 1)
      continue
    }
    if (route.endDate && cursor > route.endDate) break
    if (day > 0 && weekdayOf(cursor) === day) out.push(cursor)
    cursor = shiftDateKey(cursor, 1)
  }
  return out
}

export function usageKey(routeId: string, date: string): string {
  return `${routeId}|${date}`
}

export interface BuildSlotsParams {
  routes: (DeliveryRouteInput & { zoneName: string })[]
  blocked: BlockedDateInput[]
  usage: Map<string, RouteUsage>
  now?: Date
  horizonDays?: number
  limit?: number
}

/**
 * Lista de opções de entrega: próximas datas por rota, já marcando se a rota
 * está aberta (agora < cutoff) e a capacidade utilizada.
 */
export function buildSlots(params: BuildSlotsParams): DeliverySlot[] {
  const { routes, blocked, usage, now = new Date(), horizonDays = 30, limit = 8 } = params
  const fromKey = todayKey(now)
  const blockedSet = new Set(blocked.map((b) => `${b.zoneId}|${b.date}`))
  const slots: DeliverySlot[] = []

  for (const route of routes) {
    const dates = generateRouteDates(route, fromKey, horizonDays)
    for (const date of dates) {
      if (blockedSet.has(`${route.zoneId}|${date}`)) continue
      const cutoff = cutoffAtFor(route, date)
      const used = usage.get(usageKey(route.id, date)) ?? { orders: 0, items: 0 }
      slots.push({
        date,
        routeId: route.id,
        routeName: route.name,
        zoneId: route.zoneId,
        zoneName: route.zoneName,
        weekdayLabel: WEEKDAY_LONG[weekdayOf(date)],
        dateLabel: dateLabelFor(date),
        cutoffAt: cutoff.toISOString(),
        cutoffLabel: cutoffLabelFor(route, date),
        cutoffOffsetDays: route.cutoffOffsetDays,
        windowStart: route.windowStart,
        windowEnd: route.windowEnd,
        windowLabel: windowLabelFor(route),
        open: now.getTime() < cutoff.getTime(),
        capacity: {
          enabled: route.capacityEnabled,
          maxOrders: route.capacityEnabled ? route.maxOrders : null,
          maxItems: route.capacityEnabled ? route.maxItems : null,
          usedOrders: used.orders,
          usedItems: used.items,
        },
      })
    }
  }

  slots.sort((a, b) => (a.date === b.date ? a.cutoffAt.localeCompare(b.cutoffAt) : a.date.localeCompare(b.date)))
  return slots.filter((s) => s.open).slice(0, limit)
}

function toRouteInput(route: {
  id: string
  name: string
  zoneId: string
  recurring: boolean
  dayOfWeek: number | null
  date: Date | null
  startDate: Date | null
  endDate: Date | null
  cutoffTime: string
  cutoffOffsetDays: number
  windowStart: string
  windowEnd: string
  capacityEnabled: boolean
  maxOrders: number | null
  maxItems: number | null
  active: boolean
}): DeliveryRouteInput {
  return {
    id: route.id,
    name: route.name,
    zoneId: route.zoneId,
    recurring: route.recurring,
    dayOfWeek: route.dayOfWeek,
    date: route.date ? dateKey(route.date) : null,
    startDate: route.startDate ? dateKey(route.startDate) : null,
    endDate: route.endDate ? dateKey(route.endDate) : null,
    cutoffTime: route.cutoffTime,
    cutoffOffsetDays: route.cutoffOffsetDays,
    windowStart: route.windowStart,
    windowEnd: route.windowEnd,
    capacityEnabled: route.capacityEnabled,
    maxOrders: route.maxOrders,
    maxItems: route.maxItems,
    active: route.active,
  }
}

export async function getDeliverySlots(options?: {
  zoneId?: string
  now?: Date
  limit?: number
}): Promise<DeliverySlot[]> {
  const zones = await prisma.deliveryZone.findMany({ where: { active: true } })
  const zoneIds = options?.zoneId
    ? zones.filter((z) => z.id === options.zoneId).map((z) => z.id)
    : zones.map((z) => z.id)
  if (zoneIds.length === 0) return []

  const [routes, blocked] = await Promise.all([
    prisma.deliveryRoute.findMany({
      where: { active: true, zoneId: { in: zoneIds } },
      include: { zone: { select: { name: true } } },
    }),
    prisma.deliveryBlockedDate.findMany({ where: { zoneId: { in: zoneIds } } }),
  ])

  const usage = await getRouteUsage(routes.map((r) => r.id))

  return buildSlots({
    routes: routes.map((r) => ({ ...toRouteInput(r), zoneName: r.zone.name })),
    blocked: blocked.map((b) => ({ zoneId: b.zoneId, date: dateKey(b.date) })),
    usage,
    now: options?.now,
    limit: options?.limit,
  })
}

/**
 * Contagem de pedidos e unidades por (rota, data), ignorando cancelados.
 */
export async function getRouteUsage(routeIds: string[], excludeOrderId?: string): Promise<Map<string, RouteUsage>> {
  if (routeIds.length === 0) return new Map()
  const orders = await prisma.order.findMany({
    where: {
      deliveryRouteId: { in: routeIds },
      status: { not: "CANCELADO" },
      ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
    },
    select: { id: true, deliveryRouteId: true, deliveryDate: true, items: { select: { qty: true } } },
  })

  const map = new Map<string, RouteUsage>()
  for (const o of orders) {
    if (!o.deliveryRouteId || !o.deliveryDate) continue
    const key = usageKey(o.deliveryRouteId, dateKey(o.deliveryDate))
    const cur = map.get(key) ?? { orders: 0, items: 0 }
    cur.orders += 1
    cur.items += o.items.reduce((s, i) => s + i.qty, 0)
    map.set(key, cur)
  }
  return map
}

export class SlotError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

/**
 * Valida se uma (rota, data) está aberta e cabe na capacidade. Lança SlotError
 * com código quando indisponível.
 */
export async function assertSlotAvailable(opts: {
  routeId: string
  date: string // "YYYY-MM-DD"
  newItems: number
  excludeOrderId?: string
  now?: Date
}): Promise<void> {
  const { routeId, date, newItems, excludeOrderId, now } = opts
  const route = await prisma.deliveryRoute.findUnique({
    where: { id: routeId },
    include: { zone: { select: { id: true, active: true } } },
  })
  if (!route || !route.active || !route.zone.active) {
    throw new SlotError("ROUTE_UNAVAILABLE", "Esta rota de entrega não está mais disponível")
  }

  const input = toRouteInput(route)
  const dates = generateRouteDates(input, todayKey(now), 45)
  if (!dates.includes(date)) {
    throw new SlotError("ROUTE_CLOSED", "Esta data não está mais disponível para pedidos")
  }

  const blocked = await prisma.deliveryBlockedDate.findUnique({
    where: { zoneId_date: { zoneId: route.zoneId, date: new Date(`${date}T00:00:00.000Z`) } },
  })
  if (blocked) {
    throw new SlotError("ROUTE_BLOCKED", "Esta data está bloqueada para entregas")
  }

  const cutoff = cutoffAtFor(input, date)
  if ((now ?? new Date()).getTime() >= cutoff.getTime()) {
    throw new SlotError("ROUTE_CLOSED", "O prazo para pedir nesta rota já encerrou")
  }

  if (route.capacityEnabled) {
    const usage = await getRouteUsage([route.id], excludeOrderId)
    const used = usage.get(usageKey(route.id, date)) ?? { orders: 0, items: 0 }
    if (route.maxOrders != null && used.orders + 1 > route.maxOrders) {
      throw new SlotError("CAPACITY_FULL", "Esta rota atingiu o limite de pedidos")
    }
    if (route.maxItems != null && used.items + newItems > route.maxItems) {
      throw new SlotError("CAPACITY_FULL", "Esta rota atingiu o limite de itens")
    }
  }
}
