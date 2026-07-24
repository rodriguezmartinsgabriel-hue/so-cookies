import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
} from "lucide-react";

const kpis = [
  {
    label: "Faturamento Mês",
    value: "R$ 1.250",
    trend: 12,
    icon: DollarSign,
  },
  {
    label: "Lucro Líquido",
    value: "R$ 380",
    trend: 8,
    icon: TrendingUp,
  },
  {
    label: "Margem",
    value: "30,4%",
    trend: 2,
    icon: TrendingUp,
  },
  {
    label: "Pedidos Hoje",
    value: "8",
    subtitle: "2 pendentes",
    icon: ShoppingBag,
  },
];

export function TodaySummary() {
  return (
    <section>
      <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">
        Hoje
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="border border-line rounded-lg bg-paper p-4 shadow-card"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">
                {kpi.label}
              </span>
              <kpi.icon className="w-4 h-4 text-muted" strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-bold text-ink">{kpi.value}</p>
            {kpi.trend !== undefined && (
              <p
                className={`text-xs mt-1 ${
                  kpi.trend >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {kpi.trend >= 0 ? "↑" : "↓"} {Math.abs(kpi.trend)}% vs mês
                anterior
              </p>
            )}
            {kpi.subtitle && (
              <p className="text-xs text-warning mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {kpi.subtitle}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
