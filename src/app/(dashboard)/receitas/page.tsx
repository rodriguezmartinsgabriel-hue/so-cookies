"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";

export default function ReceitasPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, []);

  async function loadRecipes() {
    setLoading(true);
    try {
      const resp = await fetch("/api/recipes");
      if (resp.ok) setRecipes(await resp.json());
    } catch {}
    setLoading(false);
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Receitas</h1>
            <p className="text-sm text-muted">
              Custo calculado por ingrediente · {recipes.length} receitas
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Receita
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted">Carregando...</div>
        ) : (
          <div className="space-y-2">
            {recipes.map((recipe: any) => (
              <div
                key={recipe.id}
                className="border border-line rounded-lg bg-paper shadow-card overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpanded(expanded === recipe.id ? null : recipe.id)
                  }
                  className="w-full flex items-center justify-between p-4 hover:bg-cream/50 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-ink">
                      {recipe.name}
                    </p>
                    <p className="text-xs text-muted">
                      Rende {recipe.yield} {recipe.yieldUnit} · Custo unitário: R${" "}
                      {recipe.totalCost.toFixed(2)}
                    </p>
                  </div>
                  {expanded === recipe.id ? (
                    <ChevronUp className="w-5 h-5 text-muted" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted" />
                  )}
                </button>

                {expanded === recipe.id && (
                  <div className="border-t border-line p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                      Ingredientes
                    </p>
                    <div className="space-y-2">
                      {(recipe.ingredients || []).map((ing: any, i: number) => {
                        const cost = (ing.ingredient?.costPerKg || 0) * ing.qty;
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-ink">{ing.ingredient?.name || ing.name}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-muted">
                                {ing.qty} {ing.unit}
                              </span>
                              <span className="text-muted font-mono">
                                R$ {cost.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-line pt-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">
                        Custo Total
                      </span>
                      <span className="text-sm font-bold text-ink">
                        R$ {recipe.totalCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
            <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 className="text-lg font-bold text-ink">Nova Receita</h3>
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
                    Nome da Receita
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cookie Especial"
                    className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                      Rende (Qtd)
                    </label>
                    <input
                      type="number"
                      placeholder="12"
                      className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                      Unidade
                    </label>
                    <input
                      type="text"
                      placeholder="un"
                      className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                    Ingredientes
                  </label>
                  <button className="w-full h-10 border border-dashed border-line rounded-lg text-sm text-muted hover:bg-cream transition-colors">
                    + Adicionar ingrediente
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
