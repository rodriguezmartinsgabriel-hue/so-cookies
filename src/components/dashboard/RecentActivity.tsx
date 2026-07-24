import { Clock, Package, Truck, CheckCircle } from "lucide-react";

const activities = [
  {
    time: "11:15",
    text: "Pedido #005 saiu para entrega",
    channel: "iFood",
    icon: Truck,
  },
  {
    time: "11:00",
    text: "Pedido #003 em produção",
    channel: "Rappi",
    icon: Package,
  },
  {
    time: "10:45",
    text: "Pedido #002 confirmado",
    channel: "WhatsApp",
    icon: CheckCircle,
  },
  {
    time: "10:30",
    text: "Novo pedido #001 recebido",
    channel: "iFood",
    icon: Clock,
  },
  {
    time: "09:30",
    text: "Pedido #004 pronto para entrega",
    channel: "Direto",
    icon: Package,
  },
];

export function RecentActivity() {
  return (
    <section>
      <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">
        Atividade Recente
      </h2>
      <div className="border border-line rounded-lg bg-paper shadow-card divide-y divide-line">
        {activities.map((activity, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="w-8 h-8 rounded-full bg-cream flex items-center justify-center shrink-0">
              <activity.icon
                className="w-4 h-4 text-muted"
                strokeWidth={1.5}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink truncate">{activity.text}</p>
              <p className="text-xs text-muted">{activity.channel}</p>
            </div>
            <span className="text-xs text-muted shrink-0">{activity.time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
