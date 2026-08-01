"use client";

import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
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

export default function RelatoriosPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [salesResp, ordersResp] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/orders"),
      ]);
      if (salesResp.ok) setSales(await salesResp.json());
      if (ordersResp.ok) setOrders(await ordersResp.json());
    } catch {
      setError("Erro ao carregar relatórios");
    }
    setLoading(false);
  }

  const cutoff = useMemo(() => {
    if (!period) return null;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (period - 1));
    return d;
  }, [period]);

  const filteredSales = useMemo(() => {
    if (!cutoff) return sales;
    return sales.filter((s: any) => new Date(s.createdAt) >= cutoff);
  }, [sales, cutoff]);

  const filteredOrders = useMemo(() => {
    if (!cutoff) return orders;
    return orders.filter((o: any) => new Date(o.createdAt) >= cutoff);
  }, [orders, cutoff]);

  const totalRevenue = filteredSales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
  const avgTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  const deliveryOrders = filteredOrders.filter((o: any) => o.platform && o.status === "CONCLUIDO");
  const deliveryRevenue = deliveryOrders.reduce((sum: number, o: any) => sum + (o.total || 0) - (o.platformFee || 0), 0);
  const deliveryFees = deliveryOrders.reduce((sum: number, o: any) => sum + (o.platformFee || 0), 0);

  const channelCounts: Record<string, number> = {};
  filteredSales.forEach((s: any) => {
    const ch = s.channel?.name || s.channel || "Direto";
    channelCounts[ch] = (channelCounts[ch] || 0) + 1;
  });
  const channelNames = Object.keys(channelCounts);
  const channelData = channelNames.map((name) => ({
    name,
    value: filteredSales.length > 0 ? Math.round((channelCounts[name] / filteredSales.length) * 100) : 0,
    color: COLORS[channelNames.indexOf(name) % COLORS.length],
  }));

  const productCounts: Record<string, { sold: number; revenue: number }> = {};
  filteredSales.forEach((s: any) => {
    (s.items || []).forEach((item: any) => {
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
  filteredOrders.forEach((o: any) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });
  const statusData = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, label: STATUS_LABELS[status] || status, count }))
    .sort((a, b) => b.count - a.count);

  const salesPerDay = useMemo(() => {
    if (!cutoff) {
      const byMonth: Record<string, number> = {};
      sales.forEach((s: any) => {
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
      filteredSales.forEach((s: any) => {
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
    filteredSales.forEach((s: any) => {
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

        {error && (
          <ErrorState message={error} onRetry={load} />
        )}

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

            <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-4">
                Vendas por Dia
              </h2>
              {salesPerDay.length > 0 && salesPerDay.some((d: any) => d.total > 0) ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesPerDay} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5DCCB" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6B6156" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#6B6156" }} tickLine={false} width={54} />
                      <Tooltip formatter={(value: any) => [`R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]} labelStyle={{ color: "#111111" }} />
                      <Bar dataKey="total" fill="#111111" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-muted text-sm py-8">Sem vendas no período</p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-4">
                  Vendas por Canal
                </h2>
                {channelData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={channelData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name} ${value}%`}
                        >
                          {channelData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted text-sm py-8">Sem dados</p>
                )}
              </div>

              <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-4">
                  Pedidos por Status
                </h2>
                {statusData.length > 0 ? (
                  <div className="space-y-2">
                    {statusData.map((item) => (
                      <div key={item.status} className="flex items-center justify-between">
                        <span className="text-sm text-ink">{item.label}</span>
                        <span className="text-sm font-semibold text-ink">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted text-sm py-8">Sem dados</p>
                )}
              </div>
            </div>

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
