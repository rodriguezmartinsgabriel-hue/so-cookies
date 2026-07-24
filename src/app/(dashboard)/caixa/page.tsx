"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { cashFlow } from "@/lib/mock-data";
import { Plus, ArrowUpRight, ArrowDownLeft, Filter, X } from "lucide-react";

const categoryIcons: Record<string, string> = {
  "Venda Direta": "💰",
  "Venda iFood": "🛵",
  "Venda Rappi": "🛵",
  "Venda WhatsApp": "📱",
  "Compra Ingrediente": "🛒",
  Frete: "🚚",
  "Comissão iFood": "📊",
};

export default function CaixaPage() {
  const [showModal, setShowModal] = useState(false);

  const todayIn = cashFlow
    .filter((e) => e.type === "Entrada" && e.date === "Hoje")
    .reduce((sum, e) => sum + e.amount, 0);
  const todayOut = cashFlow
    .filter((e) => e.type === "Saída" && e.date === "Hoje")
    .reduce((sum, e) => sum + Math.abs(e.amount), 0);
  const todayBalance = todayIn - todayOut;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink">Caixa</h1>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Lançamento
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">
              Entradas Hoje
            </p>
            <p className="text-xl font-bold text-success mt-1">
              R$ {todayIn.toFixed(0)}
            </p>
          </div>
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">
              Saídas Hoje
            </p>
            <p className="text-xl font-bold text-danger mt-1">
              R$ {todayOut.toFixed(0)}
            </p>
          </div>
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">
              Saldo Hoje
            </p>
            <p
              className={`text-xl font-bold mt-1 ${
                todayBalance >= 0 ? "text-success" : "text-danger"
              }`}
            >
              R$ {todayBalance.toFixed(0)}
            </p>
          </div>
        </div>

        {/* Cash Flow Table */}
        <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-cream">
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">
                    Tipo
                  </th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">
                    Categoria
                  </th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">
                    Descrição
                  </th>
                  <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">
                    Valor
                  </th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {cashFlow.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-cream/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      {entry.type === "Entrada" ? (
                        <ArrowUpRight className="w-4 h-4 text-success" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4 text-danger" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink">
                      {entry.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {entry.description}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm font-semibold text-right ${
                        entry.amount >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      R$ {Math.abs(entry.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {entry.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Entry Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
            <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 className="text-lg font-bold text-ink">
                  Novo Lançamento
                </h3>
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
                    Tipo
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="h-10 border border-line rounded-lg text-sm font-medium text-success hover:bg-success/5 transition-colors">
                      Entrada
                    </button>
                    <button className="h-10 border border-line rounded-lg text-sm font-medium text-danger hover:bg-danger/5 transition-colors">
                      Saída
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                    Descrição
                  </label>
                  <input
                    type="text"
                    placeholder="Descrição do lançamento"
                    className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
                  />
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
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
