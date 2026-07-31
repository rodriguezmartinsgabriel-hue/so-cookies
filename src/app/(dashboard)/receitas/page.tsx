"use client";

import { useState, useEffect, useCallback } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useRole } from "@/hooks/useRole";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Plus, X, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export default function ReceitasPage() {
  const { canEdit } = useRole();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const modalRef = useFocusTrap(showModal);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    yield: "",
    yieldUnit: "un",
    ingredients: [] as { ingredientId: string; name: string; qty: string; unit: string; costPerUnit: number }[],
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [recipesResp, ingredientsResp] = await Promise.all([
        fetch("/api/recipes"),
        fetch("/api/ingredients"),
      ]);
      if (recipesResp.ok) setRecipes(await recipesResp.json());
      if (ingredientsResp.ok) setIngredients(await ingredientsResp.json());
    } catch {
      setError("Erro ao carregar receitas");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function resetForm() {
    setForm({ name: "", yield: "", yieldUnit: "un", ingredients: [] });
    setEditingRecipe(null);
  }

  function openNew() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(recipe: any) {
    setEditingRecipe(recipe);
    setForm({
      name: recipe.name || "",
      yield: String(recipe.yield || ""),
      yieldUnit: recipe.yieldUnit || "un",
      ingredients: (recipe.ingredients || []).map((ing: any) => ({
        ingredientId: ing.ingredientId || ing.ingredient?.id || "",
        name: ing.ingredient?.name || ing.name || "",
        qty: String(ing.qty || ""),
        unit: ing.unit || "g",
        costPerUnit: ing.ingredient?.costPerKg || 0,
      })),
    });
    setShowModal(true);
  }

  function addIngredient() {
    setForm({
      ...form,
      ingredients: [...form.ingredients, { ingredientId: "", name: "", qty: "", unit: "g", costPerUnit: 0 }],
    });
  }

  function removeIngredient(index: number) {
    const updated = [...form.ingredients];
    updated.splice(index, 1);
    setForm({ ...form, ingredients: updated });
  }

  function updateIngredient(index: number, field: string, value: string) {
    const updated = [...form.ingredients];
    if (field === "ingredientId") {
      const ing = ingredients.find((i: any) => i.id === value);
      updated[index] = {
        ...updated[index],
        ingredientId: value,
        name: ing?.name || "",
        costPerUnit: ing?.costPerKg || 0,
      };
    } else {
      (updated[index] as any)[field] = value;
    }
    setForm({ ...form, ingredients: updated });
  }

  function calcTotalCost(): number {
    return form.ingredients.reduce((sum, ing) => {
      const qty = parseFloat(ing.qty) || 0;
      return sum + qty * ing.costPerUnit;
    }, 0);
  }

  async function handleSave() {
    if (!form.name || !form.yield) return;
    const yieldNum = parseInt(form.yield) || 1;
    const totalCost = calcTotalCost();

    const payload = {
      name: form.name,
      yield: yieldNum,
      yieldUnit: form.yieldUnit,
      totalCost,
      ingredients: form.ingredients
        .filter((ing) => ing.ingredientId && ing.qty)
        .map((ing) => ({
          ingredientId: ing.ingredientId,
          qty: parseFloat(ing.qty) || 0,
          unit: ing.unit,
        })),
    };

    const res = editingRecipe
      ? await fetch(`/api/recipes/${editingRecipe.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error || "Erro ao salvar receita");
      return;
    }
    setShowModal(false);
    resetForm();
    await loadAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta receita?")) return;
    const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error || "Erro ao excluir receita");
      return;
    }
    await loadAll();
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Receitas</h1>
            <p className="text-sm text-muted">
              Fichas técnicas · {recipes.length} receitas
            </p>
          </div>
          {canEdit && (
            <button
              onClick={openNew}
              className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Receita
            </button>
          )}
        </div>

        {error && (
          <ErrorState message={error} onRetry={loadAll} />
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-line rounded-lg bg-paper shadow-card overflow-hidden p-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-1" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {recipes.map((recipe: any) => {
              const costPerUnit = recipe.yield > 0 ? (recipe.totalCost / recipe.yield) : 0;
              return (
                <div key={recipe.id} className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
                  <div className="flex items-center gap-2 p-4">
                    <button
                      onClick={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
                      className="flex-1 text-left flex items-center justify-between hover:bg-cream/50 transition-colors -m-1 p-1 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-semibold text-ink">{recipe.name}</p>
                        <p className="text-xs text-muted">
                          Rende {recipe.yield} {recipe.yieldUnit} · Custo total: R$ {(recipe.totalCost || 0).toFixed(2)} · Custo/un: R$ {costPerUnit.toFixed(3)}
                        </p>
                      </div>
                      {expanded === recipe.id ? (
                        <ChevronUp className="w-5 h-5 text-muted shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted shrink-0" />
                      )}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      {canEdit && (
                        <>
                          <button onClick={() => openEdit(recipe)} aria-label="Editar" className="p-2 rounded-md hover:bg-cream text-muted transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(recipe.id)} aria-label="Excluir" className="p-2 rounded-md hover:bg-cream text-danger transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {expanded === recipe.id && (
                    <div className="border-t border-line p-4 space-y-3 bg-cream/30">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide">Ingredientes</p>
                      <div className="space-y-2">
                        {(recipe.ingredients || []).map((ing: any, i: number) => {
                          const cost = (ing.ingredient?.costPerKg || 0) * ing.qty;
                          return (
                            <div key={i} className="flex items-center justify-between text-sm bg-paper rounded-lg px-3 py-2 border border-line">
                              <div className="flex items-center gap-2">
                                <span className="text-ink font-medium">{ing.ingredient?.name || ing.name}</span>
                                {ing.ingredient?.brand && <span className="text-[10px] text-muted bg-cream px-1.5 py-0.5 rounded">{ing.ingredient.brand}</span>}
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-muted text-xs">{ing.qty} {ing.unit}</span>
                                <span className="text-muted font-mono text-xs">R$ {(ing.ingredient?.costPerKg || 0).toFixed(3)}/un</span>
                                <span className="font-semibold text-ink text-xs w-16 text-right">R$ {cost.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-line pt-3 flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold text-ink">Custo Total</span>
                          <span className="text-xs text-muted ml-2">· R$ {costPerUnit.toFixed(3)} por unidade</span>
                        </div>
                        <span className="text-lg font-bold text-ink">R$ {(recipe.totalCost || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {recipes.length === 0 && (
              <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">
                Nenhuma receita cadastrada. Clique em "Nova Receita" para começar.
              </div>
            )}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="receita-title">
            <div ref={modalRef} className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 bg-paper z-10">
                <h3 id="receita-title" className="text-lg font-bold text-ink">{editingRecipe ? "Editar Receita" : "Nova Receita"}</h3>
                <button onClick={() => { setShowModal(false); resetForm(); }} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome da Receita *</label>
                  <input type="text" placeholder="Ex: Cookie Especial" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Rende (Qtd) *</label>
                    <input type="number" placeholder="20" value={form.yield} onChange={(e) => setForm({ ...form, yield: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Unidade</label>
                    <select value={form.yieldUnit} onChange={(e) => setForm({ ...form, yieldUnit: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors bg-paper">
                      <option value="un">un (unidades)</option>
                      <option value="kg">kg (quilos)</option>
                      <option value="g">g (gramas)</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-line pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wide">Ingredientes</label>
                    <button onClick={addIngredient} className="flex items-center gap-1 text-xs font-medium text-info hover:text-info/80 transition-colors">
                      <Plus className="w-3 h-3" /> Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center gap-2 bg-cream/50 rounded-lg p-2">
                        <select value={ing.ingredientId} onChange={(e) => updateIngredient(i, "ingredientId", e.target.value)} className="flex-1 h-9 px-2 border border-line rounded-lg text-xs text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink bg-paper">
                          <option value="">Selecionar ingrediente</option>
                          {ingredients.map((item: any) => (
                            <option key={item.id} value={item.id}>{item.name} (R$ {(item.costPerKg || 0).toFixed(2)}/{item.unit || "g"})</option>
                          ))}
                        </select>
                        <input type="number" step="0.1" placeholder="Qtd" value={ing.qty} onChange={(e) => updateIngredient(i, "qty", e.target.value)} className="w-20 h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink bg-paper" />
                        <select value={ing.unit} onChange={(e) => updateIngredient(i, "unit", e.target.value)} className="w-16 h-9 px-1 border border-line rounded-lg text-xs text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink bg-paper">
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="un">un</option>
                          <option value="ml">ml</option>
                        </select>
                        <span className="text-xs text-muted w-16 text-right">R$ {((parseFloat(ing.qty) || 0) * ing.costPerUnit).toFixed(2)}</span>
                        <button onClick={() => removeIngredient(i)} aria-label="Remover" className="p-1 rounded hover:bg-cream text-danger"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                    {form.ingredients.length === 0 && (
                      <p className="text-xs text-muted text-center py-4">Nenhum ingrediente adicionado</p>
                    )}
                  </div>
                  {form.ingredients.length > 0 && (
                    <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                      <span className="text-sm font-semibold text-ink">Custo Total</span>
                      <span className="text-lg font-bold text-ink">R$ {calcTotalCost().toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2 sticky bottom-0 bg-paper">
                <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
                  {editingRecipe ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
