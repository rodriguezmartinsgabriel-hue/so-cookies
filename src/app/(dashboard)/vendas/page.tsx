"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { products, channels } from "@/lib/mock-data";
import { Plus, Search, Filter, ChevronDown, X } from "lucide-react";

const statusLabels: Record<string, { label: string; color: string }> = {
  ifood: { label: "iFood", color: "bg-danger/10 text-danger" },
  rappi: { label: "Rappi", color: "bg-warning/10 text-warning" },
  whatsapp: { label: "WhatsApp", color: "bg-success/10 text-success" },
  direto: { label: "Direto", color: "bg-ink/10 text-ink" },
};

const mockSales = [
  { id: "001", channel: "iFood", customer: "Maria Silva", total: 68, items: 6, date: "24/07", status: "concluido" },
  { id: "002", channel: "WhatsApp", customer: "João Santos", total: 102, items: 9, date: "24/07", status: "concluido" },
  { id: "003", channel: "Rappi", customer: "Ana Costa", total: 48, items: 3, date: "24/07", status: "concluido" },
  { id: "004", channel: "Direto", customer: "Pedro Lima", total: 192, items: 12, date: "24/07", status: "concluido" },
  { id: "005", channel: "iFood", customer: "Lucia Ferreira", total: 58, items: 5, date: "23/07", status: "concluido" },
  { id: "006", channel: "WhatsApp", customer: "Carlos Souza", total: 60, items: 5, date: "23/07", status: "concluido" },
  { id: "007", channel: "Direto", customer: "Fernanda Alves", total: 120, items: 8, date: "23/07", status: "concluido" },
  { id: "008", channel: "Rappi", customer: "Roberto Dias", total: 76, items: 4, date: "23/07", status: "concluido" },
];

export default function VendasPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = mockSales.filter(
    (s) =>
      s.customer.toLowerCase().includes(search.toLowerCase()) ||
      s.channel.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = mockSales.reduce((sum, s) => sum + s.total, 0);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Vendas</h1>
            <p className="text-sm text-muted">
              Total: R$ {totalRevenue.toLocaleString("pt-BR")} · {mockSales.length}{" "}
              vendas
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Venda
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar por cliente ou canal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
          />
        </div>

        {/* Table */}
        <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-cream">
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">
                    Pedido
                  </th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">
                    Canal
                  </th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">
                    Cliente
                  </th>
                  <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">
                    Itens
                  </th>
                  <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">
                    Total
                  </th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((sale) => {
                  const channelStyle =
                    statusLabels[sale.channel] || {
                      label: sale.channel,
                      color: "bg-cream text-muted",
                    };
                  return (
                    <tr key={sale.id} className="hover:bg-cream/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-ink">
                        #{sale.id}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${channelStyle.color}`}
                        >
                          {channelStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink">
                        {sale.customer}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted text-right">
                        {sale.items}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-ink text-right">
                        R$ {sale.total}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{sale.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Sale Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
            <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 className="text-lg font-bold text-ink">Nova Venda</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-md hover:bg-cream text-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                    Canal de Venda
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {channels.map((ch) => (
                      <button
                        key={ch.id}
                        className="h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors"
                      >
                        {ch.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                    Cliente
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do cliente"
                    className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                    Itens
                  </label>
                  <button className="w-full h-10 border border-dashed border-line rounded-lg text-sm text-muted hover:bg-cream transition-colors">
                    + Adicionar item
                  </button>
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors"
                >
                  Cancelar
                </button>
                <button className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
                  Registrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
