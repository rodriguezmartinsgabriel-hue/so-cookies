import { AlertTriangle } from "lucide-react";

type Ingredient = {
  id: string;
  name: string;
  stockKg: number;
  minStockKg: number;
  supplier: string;
};

export function LowStock({ items }: { items: Ingredient[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning" />
        Estoque Baixo
      </h2>
      <div className="border border-line rounded-lg bg-paper shadow-card divide-y divide-line">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink">{item.name}</p>
              <p className="text-xs text-muted">Fornecedor: {item.supplier}</p>
            </div>
            <div className="text-right shrink-0">
              <p
                className={`text-sm font-semibold ${
                  item.stockKg <= item.minStockKg ? "text-danger" : "text-warning"
                }`}
              >
                {item.stockKg} kg
              </p>
              <p className="text-xs text-muted">min: {item.minStockKg} kg</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
