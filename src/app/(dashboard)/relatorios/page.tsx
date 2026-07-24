"use client";

import { useState } from "react";
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

const monthlyData = [
  { month: "Mai", revenue: 980, cost: 686, profit: 294 },
  { month: "Jun", revenue: 1120, cost: 784, profit: 336 },
  { month: "Jul", revenue: 1250, cost: 870, profit: 380 },
];

const channelData = [
  { name: "iFood", value: 35, color: "#C23B2E" },
  { name: "Rappi", value: 25, color: "#E0A400" },
  { name: "WhatsApp", value: 25, color: "#2F7A3E" },
  { name: "Direto", value: 15, color: "#111111" },
];

const topProducts = [
  { name: "Cookie Chocolate Belga", sold: 156, revenue: 2184 },
  { name: "Cookie Clássico", sold: 142, revenue: 1704 },
  { name: "Combo Cookie + Café", sold: 89, revenue: 1602 },
  { name: "Brownie Clássico", sold: 78, revenue: 780 },
  { name: "Cookie Nutella", sold: 65, revenue: 1040 },
];

export default function RelatoriosPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ink">Relatórios</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-muted" />
              <span className="text-xs text-muted uppercase">Receita</span>
            </div>
            <p className="text-2xl font-bold text-ink">R$ 3.350</p>
            <p className="text-xs text-success">↑ 12% vs mês anterior</p>
          </div>
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-muted" />
              <span className="text-xs text-muted uppercase">Lucro</span>
            </div>
            <p className="text-2xl font-bold text-ink">R$ 1.010</p>
            <p className="text-xs text-success">↑ 8% vs mês anterior</p>
          </div>
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="w-4 h-4 text-muted" />
              <span className="text-xs text-muted uppercase">Pedidos</span>
            </div>
            <p className="text-2xl font-bold text-ink">187</p>
            <p className="text-xs text-success">↑ 15% vs mês anterior</p>
          </div>
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-muted" />
              <span className="text-xs text-muted uppercase">Ticket Médio</span>
            </div>
            <p className="text-2xl font-bold text-ink">R$ 17,91</p>
            <p className="text-xs text-danger">↓ 3% vs mês anterior</p>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
          <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-4">
            Receita vs Lucro (3 meses)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E0D6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#6B6B6B" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6B6B6B" }}
                  tickFormatter={(v) => `R$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E4E0D6",
                    fontSize: 12,
                  }}
                  formatter={(value) => [
                    `R$ ${Number(value).toFixed(0)}`,
                    undefined,
                  ]}
                />
                <Bar dataKey="revenue" fill="#111111" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="#2F7A3E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Channel Distribution */}
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-4">
              Vendas por Canal
            </h2>
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
          </div>

          {/* Top Products */}
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-4">
              Top Produtos
            </h2>
            <div className="space-y-2">
              {topProducts.map((product, i) => (
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
