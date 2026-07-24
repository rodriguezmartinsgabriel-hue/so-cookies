import {
  ShoppingCart,
  Package,
  Factory,
  DollarSign,
  FileText,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

const actions = [
  { label: "Novo Pedido", icon: ShoppingCart, href: "/pedidos" },
  { label: "Estoque", icon: Package, href: "/estoque" },
  { label: "Produção", icon: Factory, href: "/producao" },
  { label: "Caixa", icon: DollarSign, href: "/caixa" },
  { label: "Receitas", icon: FileText, href: "/receitas" },
  { label: "Relatórios", icon: BarChart3, href: "/relatorios" },
];

export function QuickActions() {
  return (
    <section>
      <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">
        Acesso Rápido
      </h2>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-2 p-3 border border-line rounded-lg bg-paper hover:bg-cream transition-colors shadow-card"
          >
            <action.icon className="w-5 h-5 text-ink" strokeWidth={1.5} />
            <span className="text-xs font-medium text-muted text-center">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
