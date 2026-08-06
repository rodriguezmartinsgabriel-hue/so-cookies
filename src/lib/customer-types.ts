export type AddressState = {
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

export const EMPTY_ADDRESS: AddressState = {
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
}

export type PublicOrderItem = {
  id: string
  qty: number
  price: number
  product: { id: string; name: string } | null
  name: string | null
}

export type Profile = {
  id: string
  name: string
  email: string
  phone: string | null
  addressCep?: string | null
  addressStreet?: string | null
  addressNumber?: string | null
  addressComplement?: string | null
  addressNeighborhood?: string | null
  addressCity?: string | null
  addressState?: string | null
  hasPassword?: boolean
}

export type PublicOrder = {
  id: string
  status: string
  total: number
  pickupCode: string | null
  notes: string | null
  createdAt: string
  deliveryDate: string | null
  deliveryRouteId: string | null
  deliveryRoute?: { id: string; name: string; windowStart?: string; windowEnd?: string } | null
  deliveryAddress: string | null
  deliveryCep: string | null
  deliveryStreet: string | null
  deliveryNumber: string | null
  deliveryComplement: string | null
  deliveryNeighborhood: string | null
  deliveryCity: string | null
  deliveryState: string | null
  items: PublicOrderItem[]
}

export const statusLabel: Record<string, string> = {
  PENDENTE: "Recebido",
  CONFIRMADO: "Confirmado",
  PRODUCAO: "Em produção",
  PRONTO: "Pronto",
  ENTREGA: "Em entrega",
  CONCLUIDO: "Finalizado",
  CANCELADO: "Cancelado",
}

export type DeliverySlot = {
  date: string
  routeId: string
  routeName: string
  zoneId: string
  zoneName: string
  weekdayLabel: string
  dateLabel: string
  cutoffAt: string
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
