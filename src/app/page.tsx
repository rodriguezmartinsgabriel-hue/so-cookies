"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  ShoppingBag,
  Package,
  FileText,
  DollarSign,
  Factory,
  BarChart3,
  Truck,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import Link from "next/link";

const modules = [
  { label: "Pedidos", icon: ShoppingBag, href: "/pedidos", color: "bg-info/10 text-info", desc: "Gerenciar pedidos" },
  { label: "Vendas", icon: DollarSign, href: "/vendas", color: "bg-success/10 text-success", desc: "Controle de vendas" },
  { label: "Receitas", icon: FileText, href: "/receitas", color: "bg-warning/10 text-warning", desc: "Fichas técnicas" },
  { label: "Insumos", icon: Package, href: "/estoque", color: "bg-danger/10 text-danger", desc: "Estoque e fornecedores" },
  { label: "Produção", icon: Factory, href: "/producao", color: "bg-ink/10 text-ink", desc: "Lotes e perdas" },
  { label: "Caixa", icon: DollarSign, href: "/caixa", color: "bg-success/10 text-success", desc: "Fluxo de caixa" },
  { label: "Delivery", icon: Truck, href: "/delivery", color: "bg-info/10 text-info", desc: "Entregas" },
  { label: "Relatórios", icon: BarChart3, href: "/relatorios", color: "bg-muted/10 text-muted", desc: "Análises" },
  { label: "Previsão", icon: ClipboardList, href: "/previsao", color: "bg-warning/10 text-warning", desc: "Previsão de demanda" },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [kpis, setKpis] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status]);

  async function loadData() {
    setLoading(true);
    try {
      const [kpisResp, ordersResp, lowStockResp] = await Promise.allSettled([
        fetch("/api/dashboard/kpis"),
        fetch("/api/orders"),
        fetch("/api/ingredients/low-stock"),
      ]);

      if (kpisResp.status === "fulfilled" && kpisResp.value.ok) {
        setKpis(await kpisResp.value.json());
      } else {
        setKpis({ revenue: 450, profit: 130, margin: 28.9, ordersToday: 2, pendingOrders: 0, todayIn: 450, todayOut: 320, todayBalance: 130 });
      }

      if (ordersResp.status === "fulfilled" && ordersResp.value.ok) {
        const orders = await ordersResp.value.json();
        setRecentOrders(orders.slice(0, 5));
      }

      if (lowStockResp.status === "fulfilled" && lowStockResp.value.ok) {
        setLowStock(await lowStockResp.value.json());
      }
    } catch {}
    setLoading(false);
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="h-screen flex items-center justify-center bg-paper">
        <div className="text-center">
          <h1 className="font-brand text-4xl text-ink">só</h1>
          <p className="text-muted text-sm mt-2">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Olá, {session?.user?.name || "Usuário"} 👋
          </h1>
          <p className="text-sm text-muted mt-1">
            Painel de gestão — Só Cookies & Café
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">Faturamento</span>
              <TrendingUp className="w-4 h-4 text-success" strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-bold text-ink">R$ {kpis?.revenue?.toFixed(0) || "0"}</p>
            <p className="text-xs text-muted mt-1">mês atual</p>
          </div>
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">Lucro</span>
              <TrendingUp className="w-4 h-4 text-success" strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-bold text-success">R$ {kpis?.profit?.toFixed(0) || "0"}</p>
            <p className="text-xs text-muted mt-1">margem {kpis?.margin?.toFixed(1) || 0}%</p>
          </div>
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">Pedidos Hoje</span>
              <ShoppingBag className="w-4 h-4 text-info" strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-bold text-ink">{kpis?.ordersToday || 0}</p>
            <p className="text-xs text-warning mt-1">{kpis?.pendingOrders || 0} pendentes</p>
          </div>
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">Saldo Hoje</span>
              <DollarSign className="w-4 h-4 text-muted" strokeWidth={1.5} />
            </div>
            <p className={`text-2xl font-bold ${(kpis?.todayBalance || 0) >= 0 ? "text-success" : "text-danger"}`}>
              R$ {kpis?.todayBalance?.toFixed(0) || "0"}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-success flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />{kpis?.todayIn || 0}
              </span>
              <span className="text-danger flex items-center gap-0.5">
                <ArrowDownLeft className="w-3 h-3" />{kpis?.todayOut || 0}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">
            Módulos
          </h2>
          <div className="grid grid-cols-3 lg:grid-cols-3 gap-3">
            {modules.map((mod) => (
              <Link
                key={mod.label}
                href={mod.href}
                className="flex flex-col items-center gap-3 p-5 border border-line rounded-xl bg-paper hover:bg-cream hover:shadow-md transition-all shadow-card group"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mod.color} group-hover:scale-110 transition-transform`}>
                  <mod.icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <span className="text-sm font-semibold text-ink block">{mod.label}</span>
                  <span className="text-[10px] text-muted">{mod.desc}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {lowStock.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Estoque Baixo
            </h2>
            <div className="border border-line rounded-lg bg-paper shadow-card divide-y divide-line">
              {lowStock.slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{item.name}</p>
                    <p className="text-xs text-muted">{item.supplier}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-danger">{item.stockKg} kg</p>
                    <p className="text-xs text-muted">mín: {item.minStockKg} kg</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentOrders.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">
              Pedidos Recentes
            </h2>
            <div className="border border-line rounded-lg bg-paper shadow-card divide-y divide-line">
              {recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {order.customer} — {order.channel}
                    </p>
                    <p className="text-xs text-muted">{(order.items || []).length} itens</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-ink">R$ {order.total}</p>
                    <p className="text-xs text-muted">{order.status?.toLowerCase()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
