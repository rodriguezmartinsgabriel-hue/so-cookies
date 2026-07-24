import { AppShell } from "@/components/layout/AppShell";
import { Truck, Clock, CheckCircle, MapPin } from "lucide-react";

const deliveries = [
  {
    id: "005",
    customer: "Lucia Ferreira",
    channel: "iFood",
    address: "Rua das Flores, 123",
    status: "em_rota",
    driver: "Motorista 1",
    items: 5,
    total: 58,
  },
  {
    id: "003",
    customer: "Ana Costa",
    channel: "Rappi",
    address: "Av. Brasil, 456",
    status: "aguardando",
    driver: "—",
    items: 3,
    total: 48,
  },
  {
    id: "004",
    customer: "Pedro Lima",
    channel: "Direto",
    address: "Rua da Paz, 789",
    status: "aguardando",
    driver: "—",
    items: 12,
    total: 192,
  },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  em_rota: { label: "Em Rota", color: "text-success bg-success/10" },
  aguardando: { label: "Aguardando", color: "text-warning bg-warning/10" },
  entregue: { label: "Entregue", color: "text-muted bg-cream" },
};

export default function DeliveryPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-ink">Delivery</h1>

        {/* Channel filter */}
        <div className="flex gap-2 overflow-x-auto">
          {["Todos", "iFood", "Rappi", "WhatsApp", "Direto"].map((ch) => (
            <button
              key={ch}
              className="h-8 px-3 border border-line rounded-full text-xs font-medium text-ink hover:bg-cream transition-colors shrink-0"
            >
              {ch}
            </button>
          ))}
        </div>

        {/* Delivery list */}
        <div className="space-y-2">
          {deliveries.map((d) => {
            const cfg = statusConfig[d.status];
            return (
              <div
                key={d.id}
                className="border border-line rounded-lg bg-paper p-4 shadow-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink">
                        #{d.id} — {d.customer}
                      </p>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {d.address}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {d.channel} · {d.items} itens
                    </p>
                  </div>
                  <span className="text-sm font-bold text-ink">
                    R$ {d.total}
                  </span>
                </div>
                {d.status === "aguardando" && (
                  <button className="mt-3 w-full h-9 border border-line rounded-lg text-xs font-medium text-ink hover:bg-cream transition-colors">
                    Designar Motorista
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
