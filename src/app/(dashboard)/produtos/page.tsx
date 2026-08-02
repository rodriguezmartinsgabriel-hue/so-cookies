"use client"

import { useState } from "react"
import { useConfirm } from "@/hooks/useConfirm"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { useRole } from "@/hooks/useRole"
import { useQueryData } from "@/hooks/useQueryData"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/ErrorState"
import { repository } from "@/lib/repository"
import { computeMargin, formatBRL, parseCurrencyPtBr } from "@/lib/utils"
import type { Product } from "@/lib/entity-types"
import { Plus, Edit, Trash2, X, Search, Cookie } from "lucide-react"
import NextImage from "next/image"

const emptyForm = { name: "", sku: "", category: "", price: "", cost: "", unit: "un", image: "", active: true }

export default function ProdutosPage() {
  const { canEdit } = useRole();
  const { confirm, dialog } = useConfirm()
  const { data: products, isLoading: loading, error: productsError, invalidate } = useQueryData("products")
  const error = productsError ? "Erro ao carregar produtos" : null
  const [showModal, setShowModal] = useState(false)
  const modalRef = useFocusTrap(showModal)
  const [editingItem, setEditingItem] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"TODOS" | "ATIVOS" | "INATIVOS">("TODOS")

  function openEdit(item: Product) {
    setEditingItem(item)
    setForm({
      name: item.name || "",
      sku: item.sku || "",
      category: item.category || "",
      price: String(item.price ?? 0),
      cost: String(item.cost ?? 0),
      unit: item.unit || "un",
      image: item.image || "",
      active: item.active !== false,
    })
    setShowModal(true)
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingItem(null)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.sku.trim() || !form.category.trim()) return
    const price = parseCurrencyPtBr(form.price)
    const cost = parseCurrencyPtBr(form.cost)
    if (!Number.isFinite(price) || !Number.isFinite(cost)) return
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category.trim(),
      price,
      cost,
      unit: form.unit.trim() || "un",
      image: form.image.trim() || null,
      active: form.active,
    }
    if (editingItem) {
      await repository.products.update(editingItem.id, payload)
    } else {
      await repository.products.create(payload)
    }
    setShowModal(false)
    resetForm()
    await invalidate()
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Excluir este produto?", "O produto sairá do catálogo em todos os dispositivos (vendas históricas são preservadas)."))) return
    await repository.products.delete(id)
    await invalidate()
  }

  async function handleToggleActive(item: Product) {
    await repository.products.update(item.id, { active: !item.active })
    await invalidate()
  }

  const query = search.trim().toLowerCase()
  const filtered = products
    .filter((p: Product) => (filter === "TODOS" ? true : filter === "ATIVOS" ? p.active : !p.active))
    .filter((p: Product) => (query ? p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query) || p.category.toLowerCase().includes(query) : true))

  const priceNum = Number.isFinite(parseCurrencyPtBr(form.price)) ? parseCurrencyPtBr(form.price) : NaN
  const costNum = Number.isFinite(parseCurrencyPtBr(form.cost)) ? parseCurrencyPtBr(form.cost) : NaN
  const previewMargin = Number.isFinite(priceNum) && Number.isFinite(costNum) ? computeMargin(priceNum, costNum) : NaN

  const activeCount = products.filter((p: Product) => p.active).length

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-ink">Catálogo de Produtos</h1>
            <p className="text-sm text-muted">{activeCount} ativo(s) · {products.length - activeCount} inativo(s)</p>
          </div>
          {canEdit && (
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Produto
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar por nome, SKU ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
            />
          </div>
          <div className="flex gap-1 bg-cream border border-line rounded-lg p-1">
            {(["TODOS", "ATIVOS", "INATIVOS"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 h-8 rounded-md text-xs font-medium transition-colors ${filter === f ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <ErrorState message={error} onRetry={invalidate} />
        )}

        {loading ? (
          <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line bg-cream">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <th key={i} className="px-4 py-3"><Skeleton className="h-3 w-16" /></th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-4 w-28" /></div></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-14" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-14" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-14" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16 mx-auto" /></td>
                      <td className="px-4 py-3"><div className="flex justify-center gap-1"><Skeleton className="h-7 w-7" /><Skeleton className="h-7 w-7" /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">
            {products.length === 0 ? "Nenhum produto cadastrado. Clique em \"Novo Produto\" para começar." : "Nenhum produto encontrado com os filtros atuais."}
          </div>
        ) : (
          <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line bg-cream">
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Produto</th>
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Categoria</th>
                    <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Preço</th>
                    <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Custo</th>
                    <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Margem</th>
                    <th className="text-center text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Status</th>
                    <th className="text-center text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((p: Product) => (
                    <tr key={p.id} className="hover:bg-cream/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center shrink-0">
                            {p.image ? (
                              <NextImage src={p.image} alt={p.name} width={32} height={32} unoptimized className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <Cookie className="w-4 h-4 text-muted" strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{p.name}</p>
                            <p className="text-xs text-muted">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{p.category}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-ink text-right">{formatBRL(p.price)}</td>
                      <td className="px-4 py-3 text-sm text-ink text-right">{formatBRL(p.cost)}</td>
                      <td className="px-4 py-3 text-sm text-ink text-right">{Number.isFinite(p.margin) ? `${p.margin.toFixed(1)}%` : "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {canEdit ? (
                          <button
                            onClick={() => handleToggleActive(p)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${p.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-kraft/20 text-muted hover:bg-kraft/40"}`}
                          >
                            {p.active ? "Ativo" : "Inativo"}
                          </button>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${p.active ? "bg-green-100 text-green-700" : "bg-kraft/20 text-muted"}`}>
                            {p.active ? "Ativo" : "Inativo"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && (
                            <>
                              <button onClick={() => openEdit(p)} aria-label="Editar" className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(p.id)} aria-label="Excluir" className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="produto-title">
            <div ref={modalRef} className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 id="produto-title" className="text-lg font-bold text-ink">{editingItem ? "Editar Produto" : "Novo Produto"}</h3>
                <button onClick={() => { setShowModal(false); resetForm(); }} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome *</label>
                  <input type="text" placeholder="Ex: Cookie Clássico" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">SKU *</label>
                    <input type="text" placeholder="Ex: ck-classico" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Unidade</label>
                    <input type="text" placeholder="Ex: un, cx, kg" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Categoria *</label>
                  <input type="text" placeholder="Ex: Doces, Salgados, Bebidas..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Preço (R$) *</label>
                    <input type="text" inputMode="decimal" placeholder="0,00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Custo (R$) *</label>
                    <input type="text" inputMode="decimal" placeholder="0,00" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Imagem (URL opcional)</label>
                  <input type="text" placeholder="https://..." value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div className="flex items-center justify-between bg-cream border border-line rounded-lg px-3 py-2.5">
                  <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
                    <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-ink w-4 h-4" />
                    Produto ativo no catálogo
                  </label>
                  <span className="text-xs text-muted">
                    {Number.isFinite(previewMargin) ? `Margem: ${previewMargin.toFixed(1)}%` : "Informe preço e custo"}
                  </span>
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
        {dialog}
    </AppShell>
  )
}
