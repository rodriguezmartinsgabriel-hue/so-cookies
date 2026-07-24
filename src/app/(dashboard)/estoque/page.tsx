"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { db } from "@/lib/db-local";
import {
  Search,
  Plus,
  AlertTriangle,
  Package,
  Edit,
  Trash2,
  X,
} from "lucide-react";

const categoryColors: Record<string, string> = {
  Cookie: "bg-ink/10 text-ink",
  Brownie: "bg-kraft/50 text-ink",
  Café: "bg-cream text-ink",
  Bebida: "bg-info/10 text-info",
  Outro: "bg-muted/10 text-muted",
};

export default function EstoquePage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCategory, setFormCategory] = useState("Cookie");
  const [formCost, setFormCost] = useState("");
  const [formPrice, setFormPrice] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      if (navigator.onLine) {
        const resp = await fetch("/api/products");
        if (resp.ok) {
          const data = await resp.json();
          await db.products.bulkPut(data.map((p: any) => ({ ...p, _synced: true })));
          setProducts(data);
          setLoading(false);
          return;
        }
      }
    } catch {}
    const local = await db.products.toArray();
    setProducts(local);
    setLoading(false);
  }

  async function handleSave() {
    if (!formName || !formSku || !formCost || !formPrice) return;
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        sku: formSku,
        category: formCategory,
        cost: parseFloat(formCost),
        price: parseFloat(formPrice),
      }),
    });
    setShowModal(false);
    setFormName("");
    setFormSku("");
    setFormCost("");
    setFormPrice("");
    await loadProducts();
  }

  const filtered = products.filter(
    (p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Estoque</h1>
            <p className="text-sm text-muted">
              {products.length} produtos ativos
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar por nome ou SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
          />
        </div>

        <div className="lg:hidden space-y-2">
          {filtered.map((product: any) => (
            <div
              key={product.id}
              className="border border-line rounded-lg bg-paper p-3 shadow-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">{product.name}</p>
                  <p className="text-xs text-muted">{product.sku}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[product.category] || "bg-cream text-muted"}`}
                >
                  {product.category}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <p className="text-xs text-muted">Preço</p>
                  <p className="text-sm font-bold text-ink">
                    R$ {product.price.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Custo</p>
                  <p className="text-sm text-ink">
                    R$ {product.cost.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Margem</p>
                  <p className="text-sm text-success font-medium">
                    {product.margin.toFixed(1)}%
                  </p>
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
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">SKU</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Produto</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Categoria</th>
                  <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Custo</th>
                  <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Preço</th>
                  <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((product: any) => (
                  <tr key={product.id} className="hover:bg-cream/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted font-mono">{product.sku}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-ink">{product.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[product.category] || "bg-cream text-muted"}`}>
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted text-right">R$ {product.cost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-ink text-right">R$ {product.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-success text-right font-medium">{product.margin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
            <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 className="text-lg font-bold text-ink">Novo Produto</h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-md hover:bg-cream text-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome</label>
                    <input type="text" placeholder="Nome do produto" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">SKU</label>
                    <input type="text" placeholder="CK-001" value={formSku} onChange={(e) => setFormSku(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Categoria</label>
                    <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-ink transition-colors bg-paper">
                      <option>Cookie</option>
                      <option>Brownie</option>
                      <option>Café</option>
                      <option>Bebida</option>
                      <option>Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Custo (R$)</label>
                    <input type="number" placeholder="0.00" value={formCost} onChange={(e) => setFormCost(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Preço (R$)</label>
                    <input type="number" placeholder="0.00" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button onClick={() => setShowModal(false)} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
