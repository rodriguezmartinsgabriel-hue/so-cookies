"use client";

import { useState } from "react";
import { useConfirm } from "@/hooks/useConfirm";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useRole } from "@/hooks/useRole";
import { useQueryData } from "@/hooks/useQueryData";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Plus, X, Edit, Trash2, ChevronDown, ChevronUp, ImagePlus } from "lucide-react";
import NextImage from "next/image";
import { repository } from "@/lib/repository";
import type { Recipe, RecipeItem } from "@/lib/entity-types";

export default function ReceitasPage() {
  const { canEdit } = useRole();
  const { confirm, dialog } = useConfirm();
  const { data: recipes, isLoading: loading, error: recipesError, invalidate } = useQueryData("recipes");
  const { data: ingredients, error: ingredientsError } = useQueryData("ingredients");
  const error = recipesError || ingredientsError ? "Erro ao carregar receitas" : null;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const modalRef = useFocusTrap(showModal);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const [form, setForm] = useState({
    name: "",
    yield: "",
    yieldUnit: "un",
    preparation: "",
    image: "",
    ingredients: [] as { ingredientId: string; name: string; qty: string; unit: string; costPerUnit: number }[],
  });
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  function resetForm() {
    setForm({ name: "", yield: "", yieldUnit: "un", preparation: "", image: "", ingredients: [] });
    setImageError(null);
    setEditingRecipe(null);
  }

  function openNew() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(recipe: Recipe) {
    setEditingRecipe(recipe);
    setForm({
      name: recipe.name || "",
      yield: String(recipe.yield || ""),
      yieldUnit: recipe.yieldUnit || "un",
      preparation: recipe.preparation || "",
      image: recipe.image || "",
      ingredients: (recipe.ingredients || []).map((ing) => ({
        ingredientId: ing.ingredientId || ing.ingredient?.id || "",
        name: ing.ingredient?.name || "",
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

  function updateIngredient(index: number, field: "ingredientId" | "qty" | "unit", value: string) {
    const updated = [...form.ingredients];
    if (field === "ingredientId") {
      const ing = ingredients.find((i) => i.id === value);
      updated[index] = {
        ...updated[index],
        ingredientId: value,
        name: ing?.name || "",
        costPerUnit: ing?.costPerKg || 0,
      };
    } else {
      updated[index][field] = value;
    }
    setForm({ ...form, ingredients: updated });
  }

  function calcTotalCost(): number {
    return form.ingredients.reduce((sum, ing) => {
      const qty = parseFloat(ing.qty) || 0;
      return sum + qty * ing.costPerUnit;
    }, 0);
  }

  async function compressImage(file: File, maxDim = 900, quality = 0.82): Promise<string> {
    const loadImage = (): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Falha ao carregar imagem")); };
        img.src = url;
      });

    let source: HTMLImageElement | ImageBitmap;
    try {
      source = await createImageBitmap(file);
    } catch {
      source = await loadImage();
    }

    const width = (source as HTMLImageElement).naturalWidth || (source as ImageBitmap).width;
    const height = (source as HTMLImageElement).naturalHeight || (source as ImageBitmap).height;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas não suportado");
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    if ("close" in source && typeof (source as ImageBitmap).close === "function") {
      (source as ImageBitmap).close();
    }
    const isPng = file.type === "image/png";
    return canvas.toDataURL(isPng ? "image/png" : "image/jpeg", isPng ? undefined : quality);
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Selecione um arquivo de imagem válido.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setImageError("A imagem é muito grande (máx. 15MB).");
      return;
    }
    setImageLoading(true);
    setImageError(null);
    try {
      const dataUrl = await compressImage(file);
      setForm({ ...form, image: dataUrl });
    } catch {
      setImageError("Não foi possível processar a imagem.");
    } finally {
      setImageLoading(false);
    }
  }

  function removeImage() {
    setForm({ ...form, image: "" });
    setImageError(null);
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
      preparation: form.preparation,
      image: form.image,
      ingredients: form.ingredients
        .filter((ing) => ing.ingredientId && ing.qty)
        .map((ing) => ({
          ingredientId: ing.ingredientId,
          qty: parseFloat(ing.qty) || 0,
          unit: ing.unit,
        })),
    };

    if (editingRecipe) {
      await repository.recipes.update(editingRecipe.id, payload);
    } else {
      await repository.recipes.create(payload);
    }
    setShowModal(false);
    resetForm();
    await invalidate();
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Excluir esta receita?"))) return;
    await repository.recipes.delete(id);
    await invalidate();
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
          <ErrorState message={error} onRetry={invalidate} />
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
            {recipes.map((recipe) => {
              const costPerUnit = recipe.yield > 0 ? (recipe.totalCost / recipe.yield) : 0;
              return (
                <div key={recipe.id} className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
                  <div className="flex items-center gap-2 p-4">
                    <button
                      onClick={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
                      className="flex-1 text-left flex items-center gap-3 justify-between hover:bg-cream/50 transition-colors -m-1 p-1 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-cream border border-line shrink-0 flex items-center justify-center">
                          {recipe.image ? (
                            <NextImage src={recipe.image} alt={recipe.name} width={48} height={48} unoptimized className="w-full h-full object-cover" />
                          ) : (
                            <ImagePlus className="w-5 h-5 text-kraft" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">{recipe.name}</p>
                          <p className="text-xs text-muted">
                            Rende {recipe.yield} {recipe.yieldUnit} · Custo total: R$ {(recipe.totalCost || 0).toFixed(2)} · Custo/un: R$ {costPerUnit.toFixed(3)}
                          </p>
                        </div>
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
                      {recipe.image && (
                        <div className="rounded-lg overflow-hidden border border-line bg-paper">
                          <NextImage src={recipe.image} alt={recipe.name} width={600} height={400} unoptimized className="w-full max-h-72 object-cover" />
                        </div>
                      )}
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide">Ingredientes</p>
                      <div className="space-y-2">
                        {(recipe.ingredients || []).map((ing: RecipeItem, i: number) => {
                          const cost = (ing.ingredient?.costPerKg || 0) * ing.qty;
                          return (
                            <div key={i} className="flex items-center justify-between text-sm bg-paper rounded-lg px-3 py-2 border border-line">
                              <div className="flex items-center gap-2">
                                <span className="text-ink font-medium">{ing.ingredient?.name}</span>
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
                      {recipe.preparation && (
                        <div>
                          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Modo de Preparo</p>
                          <div className="text-sm text-ink whitespace-pre-wrap bg-paper rounded-lg p-3 border border-line max-h-64 overflow-y-auto">
                            {recipe.preparation}
                          </div>
                        </div>
                      )}
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
                Nenhuma receita cadastrada. Clique em &quot;Nova Receita&quot; para começar.
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

                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Foto do produto finalizado</label>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-cream border border-line flex items-center justify-center shrink-0">
                      {form.image ? (
                        <NextImage src={form.image} alt="Prévia da receita" width={80} height={80} unoptimized className="w-full h-full object-cover" />
                      ) : (
                        <ImagePlus className="w-6 h-6 text-kraft" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 h-9 px-3 rounded-lg border border-line text-xs font-medium text-ink hover:bg-cream transition-colors cursor-pointer">
                        <ImagePlus className="w-4 h-4" />
                        {imageLoading ? "Processando..." : form.image ? "Trocar foto" : "Enviar foto"}
                        <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" disabled={imageLoading} />
                      </label>
                      {form.image && (
                        <button onClick={removeImage} className="flex items-center gap-1 text-xs font-medium text-danger hover:underline">
                          <Trash2 className="w-3.5 h-3.5" /> Remover foto
                        </button>
                      )}
                    </div>
                  </div>
                  {imageError && <p className="text-xs text-danger mt-2">{imageError}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Modo de Preparo</label>
                  <textarea placeholder="Passo a passo do preparo..." value={form.preparation} onChange={(e) => setForm({ ...form, preparation: e.target.value })} rows={5} className="w-full px-3 py-2 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors resize-none" />
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
                          {ingredients.map((item) => (
                            <option key={item.id} value={item.id}>{item.name} (R$ {(item.costPerKg || 0).toFixed(2)}/g)</option>
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
        {dialog}
    </AppShell>
  );
}
