"use client"

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
} from "recharts"

type ChartProps = {
  salesPerDay: { name: string; total: number }[]
  channelData: { name: string; value: number; color: string }[]
  statusData: { status: string; label: string; count: number }[]
}

export default function ReportCharts({ salesPerDay, channelData, statusData }: ChartProps) {
  return (
    <>
      <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
        <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-4">
          Vendas por Dia
        </h2>
        {salesPerDay.length > 0 && salesPerDay.some((d) => d.total > 0) ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesPerDay} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--kraft)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} width={54} />
                <Tooltip
                  formatter={(value) => [`R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]}
                  labelStyle={{ color: "var(--ink)" }}
                  contentStyle={{
                    background: "var(--paper)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    color: "var(--ink)",
                  }}
                />
                <Bar dataKey="total" fill="var(--ink)" radius={[4, 4, 0, 0]} />
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
    </>
  )
}
