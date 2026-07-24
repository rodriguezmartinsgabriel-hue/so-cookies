import { Clock, Package, Truck, CheckCircle, ChefHat } from "lucide-react";

const statusIcons: Record<string, typeof Clock> = {
  PENDENTE: Clock,
  CONFIRMADO: CheckCircle,
  PRODUCAO: ChefHat,
  PRONTO: Package,
  ENTREGA: Truck,
  CONCLUIDO: CheckCircle,
};

type Order = {
  id: string;
  channel: string;
  customer: string;
  status: string;
  total: number;
  createdAt: Date;
};

export function RecentActivity({ orders }: { orders: Order[] }) {
  const recent = orders.slice(0, 5);

  if (recent.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">
          Atividade Recente
        </h2>
        <div className="border border-line rounded-lg bg-paper p-6 text-center text-sm text-muted shadow-card">
          Nenhuma atividade recente.
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">
        Atividade Recente
      </h2>
      <div className="border border-line rounded-lg bg-paper shadow-card divide-y divide-line">
        {recent.map((order) => {
          const Icon = statusIcons[order.status] || Clock;
          return (
            <div key={order.id} className="flex items-center gap-3 p-3">
              <div className="w-8 h-8 rounded-full bg-cream flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-muted" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink truncate">
                  Pedido #{order.id.slice(-3)} — {order.customer}
                </p>
                <p className="text-xs text-muted">
                  {order.channel} · R$ {order.total}
                </p>
              </div>
              <span className="text-xs text-muted shrink-0">
                {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
