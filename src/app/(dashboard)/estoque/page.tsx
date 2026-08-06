"use client"

import { useState, useRef } from "react"
import { useConfirm } from "@/hooks/useConfirm"
import { useRole } from "@/hooks/useRole"
import { useQueryData } from "@/hooks/useQueryData"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/ErrorState"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table"
import { repository } from "@/lib/repository"
import type { Ingredient, PriceTier, Product, Recipe, RecipeItem } from "@/lib/entity-types"
import { Plus, Search, Edit, Trash2, AlertTriangle } from "lucide-react"

export default function EstoquePage() {
  const { isAdmin } = useRole()
  const { confirm, dialog } = useConfirm()
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null)
  const {
    data: ingredients,
    isLoading: ingredientsLoading,
    error: ingredientsError,
    invalidate,
  } = useQueryData("ingredients")
  const { data: recipes, error: recipesError } = useQueryData("recipes")
  const loading = ingredientsLoading
  const error = ingredientsError || recipesError ? "Erro ao carregar insumos" : null
  const [tab, setTab] = useState<"insumos" | "precos" | "geral">("insumos")

  const [form, setForm] = useState({
    name: "",
    brand: "",
    stockKg: "",
    minStockKg: "",
    costPerKg: "",
    supplier: "",
    caloriesPer100g: "",
    proteinPer100g: "",
    carbsPer100g: "",
    fatPer100g: "",
  })

  function resetForm() {
    setForm({
      name: "",
      brand: "",
      stockKg: "",
      minStockKg: "",
      costPerKg: "",
      supplier: "",
      caloriesPer100g: "",
      proteinPer100g: "",
      carbsPer100g: "",
      fatPer100g: "",
    })
    setEditingItem(null)
  }

  function openEdit(item: Ingredient) {
    setEditingItem(item)
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
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name || !form.costPerKg) return
    const payload: Parameters<typeof repository.ingredients.create>[0] = {
      name: form.name,
      brand: form.brand || undefined,
      stockKg: parseFloat(form.stockKg) || 0,
      minStockKg: parseFloat(form.minStockKg) || 0,
      costPerKg: parseFloat(form.costPerKg) || 0,
      supplier: form.supplier || "Não informado",
    }
    if (form.caloriesPer100g !== "") payload.caloriesPer100g = parseFloat(form.caloriesPer100g) || 0
    if (form.proteinPer100g !== "") payload.proteinPer100g = parseFloat(form.proteinPer100g) || 0
    if (form.carbsPer100g !== "") payload.carbsPer100g = parseFloat(form.carbsPer100g) || 0
    if (form.fatPer100g !== "") payload.fatPer100g = parseFloat(form.fatPer100g) || 0

    if (editingItem) {
      await repository.ingredients.update(editingItem.id, payload)
    } else {
      await repository.ingredients.create(payload)
    }
    setShowModal(false)
    resetForm()
    await invalidate()
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Excluir este insumo?"))) return
    await repository.ingredients.delete(id)
    await invalidate()
  }

  const filtered = ingredients.filter(
    (i: Ingredient) =>
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.supplier?.toLowerCase().includes(search.toLowerCase()) ||
      i.brand?.toLowerCase().includes(search.toLowerCase()),
  )

  const lowStockItems = filtered.filter((i: Ingredient) => (i.stockKg || 0) <= (i.minStockKg || 0))
  const totalValue = filtered.reduce((sum: number, i: Ingredient) => sum + (i.stockKg || 0) * (i.costPerKg || 0), 0)

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
          {isAdmin && (
            <Button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
            >
              <Plus className="w-4 h-4" />
              Novo Insumo
            </Button>
          )}
        </div>

        <div className="flex gap-2 border-b border-line pb-2">
          <button
            type="button"
            onClick={() => setTab("insumos")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === "insumos" ? "bg-ink text-paper" : "text-muted hover:bg-cream"}`}
          >
            Insumos
          </button>
          <button
            type="button"
            onClick={() => setTab("geral")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === "geral" ? "bg-ink text-paper" : "text-muted hover:bg-cream"}`}
          >
            Geral
          </button>
          <button
            type="button"
            onClick={() => setTab("precos")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === "precos" ? "bg-ink text-paper" : "text-muted hover:bg-cream"}`}
          >
            Tabela de Preços
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            type="text"
            placeholder="Buscar por nome, marca ou fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4"
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

        {error && <ErrorState message={error} onRetry={invalidate} />}

        {tab === "insumos" ? (
          loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-3">
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
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="lg:hidden space-y-2">
                {filtered.map((item: Ingredient) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-ink">{item.name}</p>
                        {item.brand && <p className="text-xs text-muted">{item.brand}</p>}
                        <p className="text-xs text-muted">{item.supplier}</p>
                      </div>
                      <div className="flex gap-1">
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              aria-label="Editar"
                              className="p-1.5 rounded-md hover:bg-cream text-muted"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              aria-label="Excluir"
                              className="p-1.5 rounded-md hover:bg-cream text-danger"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-muted">Estoque</span>
                        <p
                          className={`font-semibold ${(item.stockKg || 0) <= (item.minStockKg || 0) ? "text-danger" : "text-ink"}`}
                        >
                          {item.stockKg} kg
                        </p>
                      </div>
                      <div>
                        <span className="text-muted">Custo/kg</span>
                        <p className="font-semibold text-ink">R$ {(item.costPerKg || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-muted">Valor</span>
                        <p className="font-semibold text-ink">
                          R$ {((item.stockKg || 0) * (item.costPerKg || 0)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="hidden lg:block">
                <Card padded={false} className="overflow-hidden">
                  <Table>
                    <THead>
                      <Tr>
                        <Th>Insumo</Th>
                        <Th>Marca</Th>
                        <Th>Fornecedor</Th>
                        <Th className="text-right">Estoque</Th>
                        <Th className="text-right">Mínimo</Th>
                        <Th className="text-right">Custo/kg</Th>
                        <Th className="text-right">Valor Estoque</Th>
                        <Th className="text-center">Ações</Th>
                      </Tr>
                    </THead>
                    <TBody>
                      {filtered.map((item: Ingredient) => (
                        <Tr key={item.id}>
                          <Td>
                            <p className="text-sm font-medium text-ink">{item.name}</p>
                          </Td>
                          <Td className="text-sm text-muted">{item.brand || "—"}</Td>
                          <Td className="text-sm text-muted">{item.supplier}</Td>
                          <Td className="text-sm text-right">
                            <span
                              className={`font-semibold ${(item.stockKg || 0) <= (item.minStockKg || 0) ? "text-danger" : "text-ink"}`}
                            >
                              {item.stockKg} kg
                            </span>
                          </Td>
                          <Td className="text-sm text-muted text-right">{item.minStockKg} kg</Td>
                          <Td className="text-sm text-right">R$ {(item.costPerKg || 0).toFixed(2)}</Td>
                          <Td className="text-sm font-semibold text-ink text-right">
                            R$ {((item.stockKg || 0) * (item.costPerKg || 0)).toFixed(2)}
                          </Td>
                          <Td className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEdit(item)}
                                    aria-label="Editar"
                                    className="p-1.5 rounded-md hover:bg-cream text-muted"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(item.id)}
                                    aria-label="Excluir"
                                    className="p-1.5 rounded-md hover:bg-cream text-danger"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </Card>
              </div>
            </>
          )
        ) : tab === "geral" ? (
          <GeralTab ingredients={ingredients} recipes={recipes} onUpdate={invalidate} />
        ) : (
          <PriceTiersTab />
        )}

        {showModal && (
          <Modal
            open
            onClose={() => {
              setShowModal(false)
              resetForm()
            }}
            title={editingItem ? "Editar Insumo" : "Novo Insumo"}
            size="md"
            footer={
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                >
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSave}>
                  {editingItem ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            }
          >
            <div className="p-4 space-y-4">
              <div>
                <label
                  htmlFor="sel-nome-label-input-type-text-placeholder-e"
                  className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5"
                >
                  Nome *
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Farinha de trigo"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Marca</label>
                  <Input
                    type="text"
                    placeholder="Ex: Dona Benta"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                    Estoque Atual (kg)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={form.stockKg}
                    onChange={(e) => setForm({ ...form, stockKg: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                    Estoque Mínimo (kg)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={form.minStockKg}
                    onChange={(e) => setForm({ ...form, minStockKg: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                    Custo/kg (R$) *
                  </label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.00"
                    value={form.costPerKg}
                    onChange={(e) => setForm({ ...form, costPerKg: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                  Fornecedor
                </label>
                <Input
                  type="text"
                  placeholder="Nome do fornecedor"
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                />
              </div>
              <div className="border-t border-line pt-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                  Tabela Nutricional (por 100g)
                </p>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-muted mb-1">Calorias (kcal)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={form.caloriesPer100g}
                      onChange={(e) => setForm({ ...form, caloriesPer100g: e.target.value })}
                      className="w-full h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted mb-1">Proteína (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={form.proteinPer100g}
                      onChange={(e) => setForm({ ...form, proteinPer100g: e.target.value })}
                      className="w-full h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted mb-1">Carboidratos (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={form.carbsPer100g}
                      onChange={(e) => setForm({ ...form, carbsPer100g: e.target.value })}
                      className="w-full h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted mb-1">Gorduras (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={form.fatPer100g}
                      onChange={(e) => setForm({ ...form, fatPer100g: e.target.value })}
                      className="w-full h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
      {dialog}
    </AppShell>
  )
}

function PriceTiersTab() {
  const { isAdmin } = useRole()
  const { confirm, dialog } = useConfirm()
  const { data: tiers, isLoading: loading, error: tiersError, invalidate } = useQueryData("priceTiers")
  const { data: products, error: productsError } = useQueryData("products")
  const error = tiersError || productsError ? "Erro ao carregar faixas de preço" : null
  const [showModal, setShowModal] = useState(false)
  const [editingTier, setEditingTier] = useState<PriceTier | null>(null)
  const [form, setForm] = useState({ name: "", minQty: "", maxQty: "", price: "", productId: "", type: "assado" })

  function productName(tier: PriceTier) {
    return products.find((p: Product) => p.id === tier.productId)?.name || "—"
  }

  async function handleSave() {
    if (!form.name || !form.price) return
    if (!form.productId) {
      alert("Selecione um produto")
      return
    }
    const payload = {
      name: form.name,
      minQty: parseInt(form.minQty) || 1,
      maxQty: form.maxQty ? parseInt(form.maxQty) : undefined,
      price: parseFloat(form.price) || 0,
      productId: form.productId,
    }
    if (editingTier) {
      await repository.priceTiers.update(editingTier.id, payload)
    } else {
      await repository.priceTiers.create(payload)
    }
    setShowModal(false)
    setEditingTier(null)
    setForm({ name: "", minQty: "", maxQty: "", price: "", productId: "", type: "assado" })
    await invalidate()
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Excluir esta faixa de preço?"))) return
    await repository.priceTiers.delete(id)
    await invalidate()
  }

  const assadoTiers = tiers.filter((t: PriceTier) => t.name?.toLowerCase().includes("assado"))
  const congeladoTiers = tiers.filter((t: PriceTier) => t.name?.toLowerCase().includes("congelado"))

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex justify-end">
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingTier(null)
              setForm({ name: "", minQty: "", maxQty: "", price: "", productId: "", type: "assado" })
              setShowModal(true)
            }}
          >
            <Plus className="w-4 h-4" /> Nova Faixa
          </Button>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={invalidate} />}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} padded={false} className="overflow-hidden">
              <div className="px-4 py-3 border-b border-line">
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="p-2 space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2 p-2">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <Card padded={false} className="overflow-hidden">
            <div className="px-4 py-3 bg-cream border-b border-line">
              <p className="text-sm font-semibold text-ink">Cookies Assados</p>
            </div>
            <Table>
              <THead>
                <Tr>
                  <Th>Produto</Th>
                  <Th>Faixa</Th>
                  <Th className="text-right">Qtd Mín</Th>
                  <Th className="text-right">Qtd Máx</Th>
                  <Th className="text-right">Preço/Un</Th>
                  <Th className="text-center">Ações</Th>
                </Tr>
              </THead>
              <TBody>
                {assadoTiers.map((tier: PriceTier) => (
                  <Tr key={tier.id}>
                    <Td className="text-sm text-muted">{productName(tier)}</Td>
                    <Td className="text-sm font-medium text-ink">{tier.name}</Td>
                    <Td className="text-sm text-right text-muted">{tier.minQty}</Td>
                    <Td className="text-sm text-right text-muted">{tier.maxQty || "∞"}</Td>
                    <Td className="text-sm font-semibold text-ink text-right">R$ {tier.price.toFixed(2)}</Td>
                    <Td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTier(tier)
                                setForm({
                                  name: tier.name,
                                  minQty: String(tier.minQty),
                                  maxQty: tier.maxQty ? String(tier.maxQty) : "",
                                  price: String(tier.price),
                                  productId: tier.productId || "",
                                  type: "assado",
                                })
                                setShowModal(true)
                              }}
                              aria-label="Editar"
                              className="p-1.5 rounded-md hover:bg-cream text-muted"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(tier.id)}
                              aria-label="Excluir"
                              className="p-1.5 rounded-md hover:bg-cream text-danger"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>

          <Card padded={false} className="overflow-hidden">
            <div className="px-4 py-3 bg-cream border-b border-line">
              <p className="text-sm font-semibold text-ink">Cookies Congelados (Pacotes)</p>
            </div>
            <Table>
              <THead>
                <Tr>
                  <Th>Produto</Th>
                  <Th>Faixa</Th>
                  <Th className="text-right">Qtd</Th>
                  <Th className="text-right">Preço Pacote</Th>
                  <Th className="text-right">Preço/Un</Th>
                  <Th className="text-center">Ações</Th>
                </Tr>
              </THead>
              <TBody>
                {congeladoTiers.map((tier: PriceTier) => (
                  <Tr key={tier.id}>
                    <Td className="text-sm text-muted">{productName(tier)}</Td>
                    <Td className="text-sm font-medium text-ink">{tier.name}</Td>
                    <Td className="text-sm text-right text-muted">{tier.minQty}</Td>
                    <Td className="text-sm font-semibold text-ink text-right">
                      R$ {(tier.price * tier.minQty).toFixed(2)}
                    </Td>
                    <Td className="text-sm text-ink text-right">R$ {tier.price.toFixed(2)}</Td>
                    <Td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTier(tier)
                                setForm({
                                  name: tier.name,
                                  minQty: String(tier.minQty),
                                  maxQty: tier.maxQty ? String(tier.maxQty) : "",
                                  price: String(tier.price),
                                  productId: tier.productId || "",
                                  type: "congelado",
                                })
                                setShowModal(true)
                              }}
                              aria-label="Editar"
                              className="p-1.5 rounded-md hover:bg-cream text-muted"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(tier.id)}
                              aria-label="Excluir"
                              className="p-1.5 rounded-md hover:bg-cream text-danger"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
        </>
      )}

      {showModal && (
        <Modal
          open
          onClose={() => {
            setShowModal(false)
            setEditingTier(null)
          }}
          title={editingTier ? "Editar Faixa" : "Nova Faixa de Preço"}
          size="sm"
          footer={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowModal(false)
                  setEditingTier(null)
                }}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                Salvar
              </Button>
            </div>
          }
        >
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Produto *</label>
              <select
                id="sel-nome-label-input-type-text-placeholder-e"
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
              >
                <option value="">Selecione um produto</option>
                {products
                  .filter((p: Product) => p.active)
                  .map((p: Product) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                Nome da Faixa
              </label>
              <Input
                type="text"
                placeholder="Ex: Assado 3un"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                  Qtd Mínima
                </label>
                <Input
                  type="number"
                  placeholder="1"
                  value={form.minQty}
                  onChange={(e) => setForm({ ...form, minQty: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                  Qtd Máxima
                </label>
                <Input
                  type="number"
                  placeholder="Opcional"
                  value={form.maxQty}
                  onChange={(e) => setForm({ ...form, maxQty: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                Preço por Unidade (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function GeralTab({
  ingredients,
  recipes,
  onUpdate,
}: {
  ingredients: Ingredient[]
  recipes: Recipe[]
  onUpdate: () => void
}) {
  const { isAdmin } = useRole()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editField, setEditField] = useState<"name" | "brand">("name")
  const [editValue, setEditValue] = useState("")
  const [newName, setNewName] = useState("")
  const [newBrand, setNewBrand] = useState("")
  const lastSaved = useRef<{ id: string; field: string; value: string } | null>(null)

  function ingredientUsage(ingredientId: string) {
    return recipes.filter((r: Recipe) =>
      (r.ingredients || []).some(
        (ri: RecipeItem) => ri.ingredientId === ingredientId || ri.ingredient?.id === ingredientId,
      ),
    )
  }

  function startEdit(id: string, field: "name" | "brand", value: string) {
    lastSaved.current = null
    setEditingId(id)
    setEditField(field)
    setEditValue(value)
  }

  async function saveEdit(id: string) {
    const value = editValue.trim()
    if (!value) return
    if (lastSaved.current?.id === id && lastSaved.current.field === editField && lastSaved.current.value === value)
      return
    lastSaved.current = { id, field: editField, value }
    await repository.ingredients.update(id, { [editField]: value })
    setEditingId(null)
    onUpdate()
  }

  async function handleAdd() {
    if (!newName.trim()) return
    await repository.ingredients.create({
      name: newName.trim(),
      brand: newBrand.trim() || undefined,
      costPerKg: 0,
      supplier: "Não informado",
    })
    setNewName("")
    setNewBrand("")
    onUpdate()
  }

  return (
    <div className="space-y-4">
      <Card padded={false} className="overflow-hidden">
        <div className="px-4 py-3 bg-cream border-b border-line">
          <p className="text-sm font-semibold text-ink">Visão Geral dos Insumos</p>
          <p className="text-xs text-muted">
            Edite nomes e marcas diretamente · Veja em quais receitas cada insumo é usado
          </p>
        </div>
        <Table>
          <THead>
            <Tr>
              <Th>Insumo</Th>
              <Th>Marca</Th>
              <Th>Usado em</Th>
              <Th className="text-right">Custo/kg</Th>
            </Tr>
          </THead>
          <TBody>
            {ingredients.map((item: Ingredient) => {
              const usage = ingredientUsage(item.id)
              return (
                <Tr key={item.id}>
                  <Td>
                    {editingId === item.id && editField === "name" ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(item.id)
                          if (e.key === "Escape") setEditingId(null)
                        }}
                        className="w-full h-8 px-2 border border-info rounded text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                      />
                    ) : (
                      <span
                        onClick={() => isAdmin && startEdit(item.id, "name", item.name)}
                        className={`text-sm font-medium text-ink px-1 rounded transition-colors ${isAdmin ? "cursor-pointer hover:bg-info/10" : ""}`}
                      >
                        {item.name}
                      </span>
                    )}
                  </Td>
                  <Td>
                    {editingId === item.id && editField === "brand" ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(item.id)
                          if (e.key === "Escape") setEditingId(null)
                        }}
                        className="w-full h-8 px-2 border border-info rounded text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                      />
                    ) : (
                      <span
                        onClick={() => isAdmin && startEdit(item.id, "brand", item.brand || "")}
                        className={`text-sm text-muted px-1 rounded transition-colors ${isAdmin ? "cursor-pointer hover:bg-info/10" : ""}`}
                      >
                        {item.brand || <span className="italic text-kraft">adicionar</span>}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {usage.length > 0 ? (
                        usage.map((r: Recipe) => (
                          <span
                            key={r.id}
                            className="text-[10px] bg-cream text-muted px-1.5 py-0.5 rounded border border-line"
                          >
                            {r.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] italic text-kraft">nenhum</span>
                      )}
                    </div>
                  </Td>
                  <Td className="text-sm text-right">R$ {(item.costPerKg || 0).toFixed(2)}</Td>
                </Tr>
              )
            })}
          </TBody>
        </Table>
      </Card>

      {isAdmin && (
        <div className="border border-dashed border-line rounded-lg bg-paper p-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Adicionar Insumo</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Nome do insumo"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
              }}
              className="flex-1 h-9 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
            />
            <input
              type="text"
              placeholder="Marca (opcional)"
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
              }}
              className="w-40 h-9 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
            />
            <Button size="sm" onClick={handleAdd} aria-label="Adicionar">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
