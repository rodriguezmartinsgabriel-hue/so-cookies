export type AddressState = {
  cep: string; street: string; number: string; complement: string;
  neighborhood: string; city: string; state: string;
}

export const EMPTY_ADDRESS: AddressState = {
  cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
}

export type PublicOrderItem = {
  id: string; qty: number; price: number;
  product: { id: string; name: string } | null; name: string | null;
}

export type DeliverySlot = {
  date: string; routeId: string; routeName: string; zoneId: string;
  zoneName: string; weekdayLabel: string; dateLabel: string;
  cutoffAt: string; cutoffLabel: string; cutoffOffsetDays: number;
  windowStart: string; windowEnd: string; windowLabel: string;
  open: boolean; capacity: {
    enabled: boolean; maxOrders: number | null; maxItems: number | null;
    usedOrders: number; usedItems: number;
  };
}