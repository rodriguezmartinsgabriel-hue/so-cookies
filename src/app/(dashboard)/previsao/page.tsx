import { AppShell } from "@/components/layout/AppShell";
import { TrendingUp, Calendar, ArrowRight } from "lucide-react";

const predictions = [
  {
    metric: "Receita Esperada (Próx. 7 dias)",
    value: "R$ 420",
    confidence: 85,
    basedOn: "Média últimos 30 dias",
  },
  {
    metric: "Pedidos Esperados (Próx. 7 dias)",
    value: "24",
    confidence: 80,
    basedOn: "Tendência de pedidos",
  },
  {
    metric: "Ingrediente em Risco",
    value: "Chocolate Belga",
    confidence: 90,
    basedOn: "Consumo × Estoque atual",
  },
  {
    metric: "Lucro Projetado (Mês)",
    value: "R$ 450",
    confidence: 75,
    basedOn: "Tendência mensal",
  },
];

export default function PrevisaoPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Previsão</h1>
          <p className="text-sm text-muted">
            Análise baseada nos últimos 30 dias
          </p>
        </div>

        {/* Predictions */}
        <div className="space-y-3">
          {predictions.map((pred, i) => (
            <div
              key={i}
              className="border border-line rounded-lg bg-paper p-4 shadow-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wide">
                    {pred.metric}
                  </p>
                  <p className="text-xl font-bold text-ink mt-1">
                    {pred.value}
                  </p>
                  <p className="text-xs text-muted mt-1">{pred.basedOn}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <TrendingUp className="w-3 h-3" />
                    {pred.confidence}% confiança
                  </div>
                  <div className="mt-2 w-16 h-1.5 bg-cream rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ink rounded-full"
                      style={{ width: `${pred.confidence}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
          <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">
            Sugestões
          </h2>
          <div className="space-y-2">
            {[
              {
                icon: "📦",
                text: "Comprar mais Chocolate Belga nos próximos 3 dias",
              },
              {
                icon: "📈",
                text: "iFood tende a crescer 15% esta semana",
              },
              {
                icon: "🕐",
                text: "Horário de pico: 11h-13h — considere mais produção",
              },
            ].map((suggestion, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-cream transition-colors"
              >
                <span className="text-lg">{suggestion.icon}</span>
                <p className="text-sm text-ink">{suggestion.text}</p>
                <ArrowRight className="w-4 h-4 text-muted ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
