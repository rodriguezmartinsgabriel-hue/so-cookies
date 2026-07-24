"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { db } from "@/lib/db-local";
import { Plus, Search, Package, Edit, Trash2, X, AlertTriangle } from "lucide-react";

export default function EstoquePage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"insumos" | "precos">("insumos");

  const [form, setForm] = useState({
    name: "", brand: "", stockKg: "", minStockKg: "", costPerKg: "", supplier: "", unit: "g",
    caloriesPer100g: "", proteinPer100g: "", carbsPer100g: "", fatPer100g: "",
  });

  const loadIngredients = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/ingredients");
      if (resp.ok) {
        const data = await resp.json();
        setIngredients(data);
        setLoading(false);
        return;
      }
    } catch {}
    const local = await db.products.toArray();
    setIngredients(local as any);
    setLoading(false);
  }, []);

  useEffect(() => { loadIngredients(); }, [loadIngredients]);

  function resetForm() {
    setForm({ name: "", brand: "", stockKg: "", minStockKg: "", costPerKg: "", supplier: "", unit: "g", caloriesPer100g: "", proteinPer100g: "", carbsPer100g: "", fatPer100g: "" });
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
      unit: item.unit || "g",
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
      unit: form.unit,
    };
    if (form.caloriesPer100g) payload.caloriesPer100g = parseFloat(form.caloriesPer100g);
    if (form.proteinPer100g) payload.proteinPer100g = parseFloat(form.proteinPer100g);
    if (form.carbsPer100g) payload.carbsPer100g = parseFloat(form.carbsPer100g);
    if (form.fatPer100g) payload.fatPer100g = parseFloat(form.fatPer100g);

    if (editingItem) {
      await fetch(`/api/ingredients/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setShowModal(false);
    resetForm();
    await loadIngredients();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este insumo?")) return;
    await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
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
            className="w-full h-10 pl-10 pr-4 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
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

        {tab === "insumos" ? (
          loading ? (
            <div className="text-center py-8 text-muted">Carregando...</div>
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
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-muted">Estoque</span>
                        <p className={`font-semibold ${(item.stockKg || 0) <= (item.minStockKg || 0) ? "text-danger" : "text-ink"}`}>
                          {item.stockKg} {item.unit || "g"}
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
                        <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Custo/Unit</th>
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
                              {item.stockKg} {item.unit || "g"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted text-right">{item.minStockKg} {item.unit || "g"}</td>
                          <td className="px-4 py-3 text-sm text-right">R$ {(item.costPerKg || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-ink text-right">R$ {((item.stockKg || 0) * (item.costPerKg || 0)).toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openEdit(item)} className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
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
        ) : (
          <PriceTiersTab />
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
            <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 bg-paper">
                <h3 className="text-lg font-bold text-ink">{editingItem ? "Editar Insumo" : "Novo Insumo"}</h3>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome *</label>
                  <input type="text" placeholder="Ex: Farinha de trigo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Marca</label>
                    <input type="text" placeholder="Ex: Dona Benta" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Unidade</label>
                    <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-ink transition-colors bg-paper">
                      <option value="g">g (gramas)</option>
                      <option value="kg">kg (quilos)</option>
                      <option value="un">un (unidades)</option>
                      <option value="ml">ml (mililitros)</option>
                      <option value="L">L (litros)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Estoque Atual</label>
                    <input type="number" step="0.1" placeholder="0" value={form.stockKg} onChange={(e) => setForm({ ...form, stockKg: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Estoque Mínimo</label>
                    <input type="number" step="0.1" placeholder="0" value={form.minStockKg} onChange={(e) => setForm({ ...form, minStockKg: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Custo/Unit (R$) *</label>
                    <input type="number" step="0.001" placeholder="0.00" value={form.costPerKg} onChange={(e) => setForm({ ...form, costPerKg: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Fornecedor</label>
                  <input type="text" placeholder="Nome do fornecedor" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                </div>
                <div className="border-t border-line pt-4">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Tabela Nutricional (por 100g)</p>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] text-muted mb-1">Calorias (kcal)</label>
                      <input type="number" step="0.1" placeholder="0" value={form.caloriesPer100g} onChange={(e) => setForm({ ...form, caloriesPer100g: e.target.value })} className="w-full h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted mb-1">Proteína (g)</label>
                      <input type="number" step="0.1" placeholder="0" value={form.proteinPer100g} onChange={(e) => setForm({ ...form, proteinPer100g: e.target.value })} className="w-full h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted mb-1">Carboidratos (g)</label>
                      <input type="number" step="0.1" placeholder="0" value={form.carbsPer100g} onChange={(e) => setForm({ ...form, carbsPer100g: e.target.value })} className="w-full h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted mb-1">Gorduras (g)</label>
                      <input type="number" step="0.1" placeholder="0" value={form.fatPer100g} onChange={(e) => setForm({ ...form, fatPer100g: e.target.value })} className="w-full h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
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
  const [showModal, setShowModal] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [form, setForm] = useState({ name: "", minQty: "", maxQty: "", price: "", productId: "", type: "assado" });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [tiersResp, prodsResp] = await Promise.all([fetch("/api/price-tiers"), fetch("/api/products")]);
        if (tiersResp.ok) setTiers(await tiersResp.json());
        if (prodsResp.ok) setProducts(await prodsResp.json());
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!form.name || !form.price) return;
    const payload = {
      name: form.name,
      minQty: parseInt(form.minQty) || 1,
      maxQty: form.maxQty ? parseInt(form.maxQty) : null,
      price: parseFloat(form.price) || 0,
      productId: form.productId || undefined,
    };
    if (editingTier) {
      await fetch(`/api/price-tiers/${editingTier.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/price-tiers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setShowModal(false);
    setEditingTier(null);
    setForm({ name: "", minQty: "", maxQty: "", price: "", productId: "", type: "assado" });
    const resp = await fetch("/api/price-tiers");
    if (resp.ok) setTiers(await resp.json());
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta faixa de preço?")) return;
    await fetch(`/api/price-tiers/${id}`, { method: "DELETE" });
    const resp = await fetch("/api/price-tiers");
    if (resp.ok) setTiers(await resp.json());
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

      {loading ? <div className="text-center py-8 text-muted">Carregando...</div> : (
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
                          <button onClick={() => { setEditingTier(tier); setForm({ name: tier.name, minQty: String(tier.minQty), maxQty: tier.maxQty ? String(tier.maxQty) : "", price: String(tier.price), productId: tier.productId || "", type: "assado" }); setShowModal(true); }} className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(tier.id)} className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
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
                          <button onClick={() => { setEditingTier(tier); setForm({ name: tier.name, minQty: String(tier.minQty), maxQty: tier.maxQty ? String(tier.maxQty) : "", price: String(tier.price), productId: tier.productId || "", type: "congelado" }); setShowModal(true); }} className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(tier.id)} className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
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
        <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
          <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-line">
              <h3 className="text-lg font-bold text-ink">{editingTier ? "Editar Faixa" : "Nova Faixa de Preço"}</h3>
              <button onClick={() => { setShowModal(false); setEditingTier(null); }} className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome da Faixa</label>
                <input type="text" placeholder="Ex: Assado 3un" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Qtd Mínima</label>
                  <input type="number" placeholder="1" value={form.minQty} onChange={(e) => setForm({ ...form, minQty: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Qtd Máxima</label>
                  <input type="number" placeholder="Opcional" value={form.maxQty} onChange={(e) => setForm({ ...form, maxQty: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Preço por Unidade (R$)</label>
                <input type="number" step="0.01" placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
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
