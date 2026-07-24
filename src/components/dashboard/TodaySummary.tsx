import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  AlertTriangle,
} from "lucide-react";

type Kpis = {
  revenue: number;
  profit: number;
  margin: number;
  ordersToday: number;
  pendingOrders: number;
  todayIn: number;
  todayOut: number;
  todayBalance: number;
};

export function TodaySummary({ kpis }: { kpis: Kpis }) {
  const cards = [
    {
      label: "Faturamento Mês",
      value: `R$ ${kpis.revenue.toFixed(0)}`,
      icon: DollarSign,
      trend: 12,
    },
    {
      label: "Lucro Líquido",
      value: `R$ ${kpis.profit.toFixed(0)}`,
      icon: TrendingUp,
      trend: 8,
    },
    {
      label: "Margem",
      value: `${kpis.margin.toFixed(1)}%`,
      icon: TrendingUp,
      trend: 2,
    },
    {
      label: "Pedidos Hoje",
      value: `${kpis.ordersToday}`,
      icon: ShoppingBag,
      subtitle: `${kpis.pendingOrders} pendentes`,
    },
  ];

  return (
    <section>
      <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">
        Hoje
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="border border-line rounded-lg bg-paper p-4 shadow-card"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">
                {card.label}
              </span>
              <card.icon className="w-4 h-4 text-muted" strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-bold text-ink">{card.value}</p>
            {card.trend !== undefined && (
              <p className="text-xs text-success mt-1">
                ↑ {card.trend}% vs mês anterior
              </p>
            )}
            {card.subtitle && (
              <p className="text-xs text-warning mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {card.subtitle}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
