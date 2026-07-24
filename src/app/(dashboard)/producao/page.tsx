import { AppShell } from "@/components/layout/AppShell";
import { ChefHat, Clock, CheckCircle, AlertTriangle } from "lucide-react";

const batches = [
  {
    id: "B001",
    recipe: "Cookie Clássico",
    qty: 48,
    startTime: "07:00",
    status: "concluido",
    by: "Ana",
  },
  {
    id: "B002",
    recipe: "Cookie Chocolate Belga",
    qty: 36,
    startTime: "08:30",
    status: "concluido",
    by: "Ana",
  },
  {
    id: "B003",
    recipe: "Brownie Clássico",
    qty: 32,
    startTime: "09:00",
    status: "em_producao",
    by: "Carlos",
  },
  {
    id: "B004",
    recipe: "Cookie Nutella",
    qty: 24,
    startTime: "10:00",
    status: "pendente",
    by: "—",
  },
];

const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof Clock }
> = {
  concluido: {
    label: "Concluído",
    color: "text-success bg-success/10",
    icon: CheckCircle,
  },
  em_producao: {
    label: "Em Produção",
    color: "text-warning bg-warning/10",
    icon: ChefHat,
  },
  pendente: {
    label: "Pendente",
    color: "text-muted bg-cream",
    icon: Clock,
  },
};

export default function ProducaoPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink">Produção</h1>
          <button className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
            <ChefHat className="w-4 h-4" />
            Novo Lote
          </button>
        </div>

        {/* Production batches */}
        <div className="space-y-2">
          {batches.map((batch) => {
            const cfg = statusConfig[batch.status];
            const Icon = cfg.icon;
            return (
              <div
                key={batch.id}
                className="border border-line rounded-lg bg-paper p-4 shadow-card"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center">
                      <Icon className="w-5 h-5 text-muted" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {batch.recipe}
                      </p>
                      <p className="text-xs text-muted">
                        Lote {batch.id} · {batch.qty} unidades · Início{" "}
                        {batch.startTime}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                    <p className="text-xs text-muted mt-1">{batch.by}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
