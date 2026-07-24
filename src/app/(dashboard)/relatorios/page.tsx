"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
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
import { TrendingUp, DollarSign, ShoppingCart, Package } from "lucide-react";

const COLORS = ["#C23B2E", "#E0A400", "#2F7A3E", "#111111"];

export default function RelatoriosPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch {}
    setLoading(false);
  }

  const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
  const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

  const channelCounts: Record<string, number> = {};
  sales.forEach((s: any) => {
    const ch = s.channel?.name || s.channel || "Direto";
    channelCounts[ch] = (channelCounts[ch] || 0) + 1;
  });
  const channelData = Object.entries(channelCounts).map(([name, value]) => ({
    name,
    value: sales.length > 0 ? Math.round((value / sales.length) * 100) : 0,
    color: COLORS[Object.keys(channelCounts).indexOf(name) % COLORS.length],
  }));

  const productCounts: Record<string, { sold: number; revenue: number }> = {};
  sales.forEach((s: any) => {
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

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ink">Relatórios</h1>

        {loading ? (
          <div className="text-center py-8 text-muted">Carregando...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-muted" />
                  <span className="text-xs text-muted uppercase">Receita</span>
                </div>
                <p className="text-2xl font-bold text-ink">R$ {totalRevenue.toLocaleString("pt-BR")}</p>
              </div>
              <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-4 h-4 text-muted" />
                  <span className="text-xs text-muted uppercase">Pedidos</span>
                </div>
                <p className="text-2xl font-bold text-ink">{orders.length}</p>
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
                <p className="text-2xl font-bold text-ink">{sales.length}</p>
              </div>
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
                            R$ {product.revenue}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted text-sm py-8">Sem dados</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
