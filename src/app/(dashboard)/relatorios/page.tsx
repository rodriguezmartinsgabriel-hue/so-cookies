"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQueryData } from "@/hooks/useQueryData";
import { TrendingUp, DollarSign, ShoppingCart, Package, Truck } from "lucide-react";

const COLORS = ["#C23B2E", "#E0A400", "#2F7A3E", "#111111"];
const PERIODS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "Tudo", days: 0 },
];
const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  CONFIRMADO: "Confirmado",
  PRODUCAO: "Produção",
  PRONTO: "Pronto",
  ENTREGA: "Entrega",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

type Sale = {
  id: string;
  createdAt: string;
  total: number;
  channel?: { name?: string } | string;
  items?: { product?: { name?: string }; qty: number; price: number }[];
};

type Order = {
  id: string;
  createdAt: string;
  status: string;
  platform?: string;
  total: number;
  platformFee?: number;
};

const ReportCharts = dynamic(() => import("@/components/charts/ReportCharts"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="border border-line rounded-lg bg-paper p-4 shadow-card">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-48" />
        </div>
      ))}
    </div>
  ),
});

export default function RelatoriosPage() {
  const { data: salesData, isLoading: salesLoading } = useQueryData("sales");
  const { data: ordersData, isLoading: ordersLoading } = useQueryData("orders");
  const [period, setPeriod] = useState(30);

  const sales = salesData as Sale[];
  const orders = ordersData as Order[];
  const loading = salesLoading || ordersLoading;

  const cutoff = useMemo(() => {
    if (!period) return null;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (period - 1));
    return d;
  }, [period]);

  const filteredSales = useMemo(() => {
    if (!cutoff) return sales;
    return sales.filter((s) => new Date(s.createdAt) >= cutoff);
  }, [sales, cutoff]);

  const filteredOrders = useMemo(() => {
    if (!cutoff) return orders;
    return orders.filter((o) => new Date(o.createdAt) >= cutoff);
  }, [orders, cutoff]);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const avgTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  const deliveryOrders = filteredOrders.filter((o) => o.platform && o.status === "CONCLUIDO");
  const deliveryRevenue = deliveryOrders.reduce((sum, o) => sum + (o.total || 0) - (o.platformFee || 0), 0);
  const deliveryFees = deliveryOrders.reduce((sum, o) => sum + (o.platformFee || 0), 0);

  const channelCounts: Record<string, number> = {};
  filteredSales.forEach((s) => {
    const ch = (typeof s.channel === "string" ? s.channel : s.channel?.name) || "Direto";
    channelCounts[ch] = (channelCounts[ch] || 0) + 1;
  });
  const channelNames = Object.keys(channelCounts);
  const channelData = channelNames.map((name) => ({
    name,
    value: filteredSales.length > 0 ? Math.round((channelCounts[name] / filteredSales.length) * 100) : 0,
    color: COLORS[channelNames.indexOf(name) % COLORS.length],
  }));

  const productCounts: Record<string, { sold: number; revenue: number }> = {};
  filteredSales.forEach((s) => {
    (s.items || []).forEach((item) => {
      const name = item.product?.name || "Produto";
      if (!productCounts[name]) productCounts[name] = { sold: 0, revenue: 0 };
      productCounts[name].sold += item.qty;
      productCounts[name].revenue += item.qty * item.price;
    });
  });
  const topProducts = Object.entries(productCounts)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const statusCounts: Record<string, number> = {};
  filteredOrders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });
  const statusData = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, label: STATUS_LABELS[status] || status, count }))
    .sort((a, b) => b.count - a.count);

  const salesPerDay = useMemo(() => {
    if (!cutoff) {
      const byMonth: Record<string, number> = {};
      sales.forEach((s) => {
        const d = new Date(s.createdAt);
        const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        byMonth[key] = (byMonth[key] || 0) + (s.total || 0);
      });
      return Object.entries(byMonth).map(([name, total]) => ({ name, total })).sort((a, b) => a.name.localeCompare(b.name));
    }

    if (period >= 90) {
      const byWeek: { name: string; total: number; index: number }[] = [];
      const days = period;
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (days - 1 - i));
        const weekIndex = Math.floor(i / 7);
        if (!byWeek[weekIndex]) {
          byWeek[weekIndex] = { name: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, total: 0, index: weekIndex };
        }
        byWeek[weekIndex].total = 0;
      }
      filteredSales.forEach((s) => {
        const d = new Date(s.createdAt);
        d.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((cutoff.getTime() - d.getTime()) / 86400000);
        const weekIndex = Math.min(Math.floor(daysDiff / 7), byWeek.length - 1);
        if (byWeek[weekIndex]) byWeek[weekIndex].total += s.total || 0;
      });
      return byWeek.sort((a, b) => a.index - b.index);
    }

    const days = period;
    const byDay: { name: string; total: number; index: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (days - 1 - i));
      byDay.push({ name: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, total: 0, index: i });
    }
    filteredSales.forEach((s) => {
      const d = new Date(s.createdAt);
      d.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((cutoff.getTime() - d.getTime()) / 86400000);
      const idx = days - 1 - daysDiff;
      if (byDay[idx]) byDay[idx].total += s.total || 0;
    });
    return byDay.sort((a, b) => a.index - b.index);
  }, [sales, filteredSales, cutoff, period]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-ink">Relatórios</h1>
          <div className="flex gap-1 border border-line rounded-lg bg-paper p-1">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={`h-8 px-3 rounded-md text-sm font-medium transition-colors ${period === p.days ? "bg-ink text-paper" : "text-muted hover:bg-cream"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border border-line rounded-lg bg-paper p-4 shadow-card">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-7 w-20" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="border border-line rounded-lg bg-paper p-4 shadow-card">
                  <Skeleton className="h-4 w-32 mb-4" />
                  <Skeleton className="h-48" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-muted" />
                  <span className="text-xs text-muted uppercase">Receita</span>
                </div>
                <p className="text-2xl font-bold text-ink">R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-4 h-4 text-muted" />
                  <span className="text-xs text-muted uppercase">Pedidos</span>
                </div>
                <p className="text-2xl font-bold text-ink">{filteredOrders.length}</p>
              </div>
              <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-muted" />
                  <span className="text-xs text-muted uppercase">Ticket Médio</span>
                </div>
                <p className="text-2xl font-bold text-ink">R$ {avgTicket.toFixed(2)}</p>
              </div>
              <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-muted" />
                  <span className="text-xs text-muted uppercase">Vendas</span>
                </div>
                <p className="text-2xl font-bold text-ink">{filteredSales.length}</p>
              </div>
            </div>

            <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-info" />
                  <span className="text-xs text-muted uppercase">Receita Delivery (marketplaces)</span>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-lg font-bold text-ink">R$ {deliveryRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted">líquida de taxas</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ink">{deliveryOrders.length}</p>
                    <p className="text-xs text-muted">pedidos concluídos</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-danger">R$ {deliveryFees.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted">em taxas</p>
                  </div>
                </div>
              </div>
            </div>

            <ReportCharts salesPerDay={salesPerDay} channelData={channelData} statusData={statusData} />

            <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-4">
                Top Produtos
              </h2>
              <div className="space-y-2">
                {topProducts.length > 0 ? (
                  topProducts.map((product, i) => (
                    <div
                      key={product.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted w-4">{i + 1}.</span>
                        <span className="text-sm text-ink">{product.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted">
                          {product.sold} un
                        </span>
                        <span className="text-sm font-semibold text-ink">
                          R$ {product.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted text-sm py-8">Sem dados</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
