"use client";

import { useState, useEffect, useCallback } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { repository } from "@/lib/repository";
import { Plus, Search, Package, Edit, Trash2, X, AlertTriangle } from "lucide-react";

export default function EstoquePage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const modalRef = useFocusTrap(showModal);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"insumos" | "precos" | "geral">("insumos");

  const [form, setForm] = useState({
    name: "", brand: "", stockKg: "", minStockKg: "", costPerKg: "", supplier: "",
    caloriesPer100g: "", proteinPer100g: "", carbsPer100g: "", fatPer100g: "",
  });

  const loadIngredients = useCallback(async () => {
    setLoading(true);
    try {
      const [ingredientsData, recipesResp] = await Promise.all([
        repository.ingredients.getAll(),
        fetch("/api/recipes").then((r) => r.ok ? r.json() : []),
      ]);
      setIngredients(ingredientsData);
      setRecipes(recipesResp);
    } catch {
      setError("Erro ao carregar insumos");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadIngredients(); }, [loadIngredients]);

  function resetForm() {
    setForm({ name: "", brand: "", stockKg: "", minStockKg: "", costPerKg: "", supplier: "", caloriesPer100g: "", proteinPer100g: "", carbsPer100g: "", fatPer100g: "" });
    setEditingItem(null);
  }

  function openEdit(item: any) {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      brand: item.brand || "",
      stockKg: String(item.stockKg ?? ""),
      minStockKg: String(item.minStockKg ?? ""),
      costPerKg: String(item.costPerKg ?? ""),
      supplier: item.supplier || "",
      caloriesPer100g: String(item.caloriesPer100g ?? ""),
      proteinPer100g: String(item.proteinPer100g ?? ""),
      carbsPer100g: String(item.carbsPer100g ?? ""),
      fatPer100g: String(item.fatPer100g ?? ""),
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.costPerKg) return;
    const payload: any = {
      name: form.name,
      brand: form.brand || undefined,
      stockKg: parseFloat(form.stockKg) || 0,
      minStockKg: parseFloat(form.minStockKg) || 0,
      costPerKg: parseFloat(form.costPerKg) || 0,
      supplier: form.supplier || "Não informado",
    };
    if (form.caloriesPer100g) payload.caloriesPer100g = parseFloat(form.caloriesPer100g);
    if (form.proteinPer100g) payload.proteinPer100g = parseFloat(form.proteinPer100g);
    if (form.carbsPer100g) payload.carbsPer100g = parseFloat(form.carbsPer100g);
    if (form.fatPer100g) payload.fatPer100g = parseFloat(form.fatPer100g);

    if (editingItem) {
      await repository.ingredients.update(editingItem.id, payload);
    } else {
      await repository.ingredients.create(payload);
    }
    setShowModal(false);
    resetForm();
    await loadIngredients();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este insumo?")) return;
    await repository.ingredients.delete(id);
    await loadIngredients();
  }

  const filtered = ingredients.filter(
    (i: any) =>
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.supplier?.toLowerCase().includes(search.toLowerCase()) ||
      i.brand?.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockItems = filtered.filter((i: any) => (i.stockKg || 0) <= (i.minStockKg || 0));
  const totalValue = filtered.reduce((sum: number, i: any) => sum + ((i.stockKg || 0) * (i.costPerKg || 0)), 0);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Insumos</h1>
            <p className="text-sm text-muted">
              {ingredients.length} insumos · Estoque total: R$ {totalValue.toFixed(2)}
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Insumo
          </button>
        </div>

        <div className="flex gap-2 border-b border-line pb-2">
          <button onClick={() => setTab("insumos")} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === "insumos" ? "bg-ink text-paper" : "text-muted hover:bg-cream"}`}>
            Insumos
          </button>
          <button onClick={() => setTab("geral")} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === "geral" ? "bg-ink text-paper" : "text-muted hover:bg-cream"}`}>
            Geral
          </button>
          <button onClick={() => setTab("precos")} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === "precos" ? "bg-ink text-paper" : "text-muted hover:bg-cream"}`}>
            Tabela de Preços
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar por nome, marca ou fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
          />
        </div>

        {lowStockItems.length > 0 && (
          <div className="border border-warning/30 rounded-lg bg-warning/5 p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <p className="text-sm text-ink">
              <span className="font-semibold">{lowStockItems.length}</span> insumo(s) abaixo do estoque mínimo
            </p>
          </div>
        )}

        {error && (
          <ErrorState message={error} onRetry={loadIngredients} />
        )}

        {tab === "insumos" ? (
          loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-line rounded-lg bg-paper p-3 shadow-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-20 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Skeleton className="h-8" />
                    <Skeleton className="h-8" />
                    <Skeleton className="h-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="lg:hidden space-y-2">
                {filtered.map((item: any) => (
                  <div key={item.id} className="border border-line rounded-lg bg-paper p-3 shadow-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-ink">{item.name}</p>
                        {item.brand && <p className="text-xs text-muted">{item.brand}</p>}
                        <p className="text-xs text-muted">{item.supplier}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(item)} aria-label="Editar" className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(item.id)} aria-label="Excluir" className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-muted">Estoque</span>
                        <p className={`font-semibold ${(item.stockKg || 0) <= (item.minStockKg || 0) ? "text-danger" : "text-ink"}`}>
                          {item.stockKg} kg
                        </p>
                      </div>
                      <div>
                        <span className="text-muted">Custo/kg</span>
                        <p className="font-semibold text-ink">R$ {(item.costPerKg || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-muted">Valor</span>
                        <p className="font-semibold text-ink">R$ {((item.stockKg || 0) * (item.costPerKg || 0)).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden lg:block border border-line rounded-lg bg-paper shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-line bg-cream">
                        <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Insumo</th>
                        <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Marca</th>
                        <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Fornecedor</th>
                        <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Estoque</th>
                        <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Mínimo</th>
                        <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Custo/kg</th>
                        <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Valor Estoque</th>
                        <th className="text-center text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filtered.map((item: any) => (
                        <tr key={item.id} className="hover:bg-cream/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-ink">{item.name}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted">{item.brand || "—"}</td>
                          <td className="px-4 py-3 text-sm text-muted">{item.supplier}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`font-semibold ${(item.stockKg || 0) <= (item.minStockKg || 0) ? "text-danger" : "text-ink"}`}>
                              {item.stockKg} kg
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted text-right">{item.minStockKg} kg</td>
                          <td className="px-4 py-3 text-sm text-right">R$ {(item.costPerKg || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-ink text-right">R$ {((item.stockKg || 0) * (item.costPerKg || 0)).toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openEdit(item)} aria-label="Editar" className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(item.id)} aria-label="Excluir" className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        ) : tab === "geral" ? (
          <GeralTab ingredients={ingredients} recipes={recipes} onUpdate={loadIngredients} />
        ) : (
          <PriceTiersTab />
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="insumo-title">
            <div ref={modalRef} className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 bg-paper">
                <h3 id="insumo-title" className="text-lg font-bold text-ink">{editingItem ? "Editar Insumo" : "Novo Insumo"}</h3>
                <button onClick={() => { setShowModal(false); resetForm(); }} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome *</label>
                  <input type="text" placeholder="Ex: Farinha de trigo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Marca</label>
                    <input type="text" placeholder="Ex: Dona Benta" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Estoque Atual (kg)</label>
                    <input type="number" step="0.01" placeholder="0" value={form.stockKg} onChange={(e) => setForm({ ...form, stockKg: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Estoque Mínimo (kg)</label>
                    <input type="number" step="0.01" placeholder="0" value={form.minStockKg} onChange={(e) => setForm({ ...form, minStockKg: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Custo/kg (R$) *</label>
                    <input type="number" step="0.001" placeholder="0.00" value={form.costPerKg} onChange={(e) => setForm({ ...form, costPerKg: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Fornecedor</label>
                  <input type="text" placeholder="Nome do fornecedor" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div className="border-t border-line pt-4">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Tabela Nutricional (por 100g)</p>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] text-muted mb-1">Calorias (kcal)</label>
                      <input type="number" step="0.1" placeholder="0" value={form.caloriesPer100g} onChange={(e) => setForm({ ...form, caloriesPer100g: e.target.value })} className="w-full h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted mb-1">Proteína (g)</label>
                      <input type="number" step="0.1" placeholder="0" value={form.proteinPer100g} onChange={(e) => setForm({ ...form, proteinPer100g: e.target.value })} className="w-full h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted mb-1">Carboidratos (g)</label>
                      <input type="number" step="0.1" placeholder="0" value={form.carbsPer100g} onChange={(e) => setForm({ ...form, carbsPer100g: e.target.value })} className="w-full h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted mb-1">Gorduras (g)</label>
                      <input type="number" step="0.1" placeholder="0" value={form.fatPer100g} onChange={(e) => setForm({ ...form, fatPer100g: e.target.value })} className="w-full h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2 sticky bottom-0 bg-paper">
                <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
                  {editingItem ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function PriceTiersTab() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const priceModalRef = useFocusTrap(showModal);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [form, setForm] = useState({ name: "", minQty: "", maxQty: "", price: "", productId: "", type: "assado" });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [tiersData, prodsResp] = await Promise.allSettled([
          repository.priceTiers.getAll(),
          fetch("/api/products").then((r) => r.ok ? r.json() : []),
        ]);
        if (tiersData.status === "fulfilled") setTiers(tiersData.value);
        if (prodsResp.status === "fulfilled") setProducts(prodsResp.value);
      } catch {
        setError("Erro ao carregar faixas de preço");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!form.name || !form.price) return;
    const payload = {
      name: form.name,
      minQty: parseInt(form.minQty) || 1,
      maxQty: form.maxQty ? parseInt(form.maxQty) : undefined,
      price: parseFloat(form.price) || 0,
      productId: form.productId || undefined,
    };
    if (editingTier) {
      await repository.priceTiers.update(editingTier.id, payload);
    } else {
      await repository.priceTiers.create(payload);
    }
    setShowModal(false);
    setEditingTier(null);
    setForm({ name: "", minQty: "", maxQty: "", price: "", productId: "", type: "assado" });
    const data = await repository.priceTiers.getAll();
    setTiers(data);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta faixa de preço?")) return;
    await repository.priceTiers.delete(id);
    const data = await repository.priceTiers.getAll();
    setTiers(data);
  }

  const assadoTiers = tiers.filter((t: any) => t.name?.toLowerCase().includes("assado"));
  const congeladoTiers = tiers.filter((t: any) => t.name?.toLowerCase().includes("congelado"));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditingTier(null); setForm({ name: "", minQty: "", maxQty: "", price: "", productId: "", type: "assado" }); setShowModal(true); }} className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
          <Plus className="w-4 h-4" /> Nova Faixa
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-line"><Skeleton className="h-4 w-32" /></div>
              <div className="p-2 space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2 p-2"><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-16" /></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
            <div className="px-4 py-3 bg-cream border-b border-line">
              <p className="text-sm font-semibold text-ink">Cookies Assados</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Faixa</th>
                    <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Qtd Mín</th>
                    <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Qtd Máx</th>
                    <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Preço/Un</th>
                    <th className="text-center text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {assadoTiers.map((tier: any) => (
                    <tr key={tier.id} className="hover:bg-cream/50">
                      <td className="px-4 py-3 text-sm font-medium text-ink">{tier.name}</td>
                      <td className="px-4 py-3 text-sm text-right text-muted">{tier.minQty}</td>
                      <td className="px-4 py-3 text-sm text-right text-muted">{tier.maxQty || "∞"}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-ink text-right">R$ {tier.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setEditingTier(tier); setForm({ name: tier.name, minQty: String(tier.minQty), maxQty: tier.maxQty ? String(tier.maxQty) : "", price: String(tier.price), productId: tier.productId || "", type: "assado" }); setShowModal(true); }} aria-label="Editar" className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(tier.id)} aria-label="Excluir" className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
            <div className="px-4 py-3 bg-cream border-b border-line">
              <p className="text-sm font-semibold text-ink">Cookies Congelados (Pacotes)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Faixa</th>
                    <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Qtd</th>
                    <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Preço Pacote</th>
                    <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Preço/Un</th>
                    <th className="text-center text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {congeladoTiers.map((tier: any) => (
                    <tr key={tier.id} className="hover:bg-cream/50">
                      <td className="px-4 py-3 text-sm font-medium text-ink">{tier.name}</td>
                      <td className="px-4 py-3 text-sm text-right text-muted">{tier.minQty}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-ink text-right">R$ {(tier.price * tier.minQty).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-ink text-right">R$ {tier.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setEditingTier(tier); setForm({ name: tier.name, minQty: String(tier.minQty), maxQty: tier.maxQty ? String(tier.maxQty) : "", price: String(tier.price), productId: tier.productId || "", type: "congelado" }); setShowModal(true); }} aria-label="Editar" className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(tier.id)} aria-label="Excluir" className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="preco-title">
          <div ref={priceModalRef} className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-line">
              <h3 id="preco-title" className="text-lg font-bold text-ink">{editingTier ? "Editar Faixa" : "Nova Faixa de Preço"}</h3>
              <button onClick={() => { setShowModal(false); setEditingTier(null); }} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome da Faixa</label>
                <input type="text" placeholder="Ex: Assado 3un" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Qtd Mínima</label>
                  <input type="number" placeholder="1" value={form.minQty} onChange={(e) => setForm({ ...form, minQty: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Qtd Máxima</label>
                  <input type="number" placeholder="Opcional" value={form.maxQty} onChange={(e) => setForm({ ...form, maxQty: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Preço por Unidade (R$)</label>
                <input type="number" step="0.01" placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
              </div>
            </div>
            <div className="p-4 border-t border-line flex gap-2">
              <button onClick={() => { setShowModal(false); setEditingTier(null); }} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
              <button onClick={handleSave} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GeralTab({ ingredients, recipes, onUpdate }: { ingredients: any[]; recipes: any[]; onUpdate: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<"name" | "brand">("name");
  const [editValue, setEditValue] = useState("");
  const [newName, setNewName] = useState("");
  const [newBrand, setNewBrand] = useState("");

  function ingredientUsage(ingredientId: string) {
    return recipes.filter((r: any) =>
      (r.ingredients || []).some((ri: any) => ri.ingredientId === ingredientId || ri.ingredient?.id === ingredientId)
    );
  }

  function startEdit(id: string, field: "name" | "brand", value: string) {
    setEditingId(id);
    setEditField(field);
    setEditValue(value);
  }

  async function saveEdit(id: string) {
    if (!editValue.trim()) return;
    await repository.ingredients.update(id, { [editField]: editValue.trim() });
    setEditingId(null);
    onUpdate();
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    await repository.ingredients.create({
      name: newName.trim(),
      brand: newBrand.trim() || undefined,
      costPerKg: 0,
      supplier: "Não informado",
    });
    setNewName("");
    setNewBrand("");
    onUpdate();
  }

  return (
    <div className="space-y-4">
      <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
        <div className="px-4 py-3 bg-cream border-b border-line">
          <p className="text-sm font-semibold text-ink">Visão Geral dos Insumos</p>
          <p className="text-xs text-muted">Edite nomes e marcas diretamente · Veja em quais receitas cada insumo é usado</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Insumo</th>
                <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Marca</th>
                <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Usado em</th>
                <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Custo/kg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ingredients.map((item: any) => {
                const usage = ingredientUsage(item.id);
                return (
                  <tr key={item.id} className="hover:bg-cream/50 transition-colors">
                    <td className="px-4 py-2">
                      {editingId === item.id && editField === "name" ? (
                        <input
                          autoFocus
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(item.id)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(item.id); if (e.key === "Escape") setEditingId(null); }}
                          className="w-full h-8 px-2 border border-info rounded text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(item.id, "name", item.name)}
                          className="text-sm font-medium text-ink cursor-pointer hover:bg-info/10 px-1 rounded transition-colors"
                        >
                          {item.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingId === item.id && editField === "brand" ? (
                        <input
                          autoFocus
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(item.id)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(item.id); if (e.key === "Escape") setEditingId(null); }}
                          className="w-full h-8 px-2 border border-info rounded text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(item.id, "brand", item.brand || "")}
                          className="text-sm text-muted cursor-pointer hover:bg-info/10 px-1 rounded transition-colors"
                        >
                          {item.brand || <span className="italic text-kraft">adicionar</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {usage.length > 0 ? usage.map((r: any) => (
                          <span key={r.id} className="text-[10px] bg-cream text-muted px-1.5 py-0.5 rounded border border-line">
                            {r.name}
                          </span>
                        )) : (
                          <span className="text-[10px] italic text-kraft">nenhum</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-right">R$ {(item.costPerKg || 0).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-dashed border-line rounded-lg bg-paper p-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Adicionar Insumo</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Nome do insumo"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            className="flex-1 h-9 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
          />
          <input
            type="text"
            placeholder="Marca (opcional)"
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            className="w-40 h-9 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
          />
          <button onClick={handleAdd} aria-label="Adicionar" className="h-9 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
