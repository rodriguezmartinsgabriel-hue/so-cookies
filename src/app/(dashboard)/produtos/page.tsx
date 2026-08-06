"use client"

import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useConfirm } from "@/hooks/useConfirm"
import { useRole } from "@/hooks/useRole"
import { useQueryData } from "@/hooks/useQueryData"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/ErrorState"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { FormField } from "@/components/ui/FormField"
import { Badge } from "@/components/ui/Badge"
import { Modal } from "@/components/ui/Modal"
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table"
import { repository } from "@/lib/repository"
import { compressImageToFit } from "@/lib/files"
import { computeMargin, formatBRL, parseCurrencyPtBr, resolveProductImage } from "@/lib/utils"
import type { Product, Recipe } from "@/lib/entity-types"
import { Plus, Edit, Trash2, Search, Cookie, ImagePlus } from "lucide-react"
import NextImage from "next/image"

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  price: "",
  cost: "",
  unit: "un",
  image: "",
  recipeId: "",
  active: true,
}

export default function ProdutosPage() {
  const { canEdit } = useRole()
  const { confirm, dialog } = useConfirm()
  const queryClient = useQueryClient()
  const { data: products, isLoading: loading, error: productsError, invalidate } = useQueryData("products")
  const { data: recipes } = useQueryData("recipes")
  const error = productsError ? "Erro ao carregar produtos" : null
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"TODOS" | "ATIVOS" | "INATIVOS">("TODOS")
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  const recipeByProduct = useMemo(() => {
    const map: Record<string, Recipe> = {}
    for (const r of recipes) if (r.productId) map[r.productId] = r
    return map
  }, [recipes])

  const linkedRecipe = form.recipeId ? recipes.find((r) => r.id === form.recipeId) : undefined

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
      recipeId: recipeByProduct[item.id]?.id || "",
      active: item.active !== false,
    })
    setImageError(null)
    setShowModal(true)
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingItem(null)
    setImageError(null)
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setImageError("Selecione um arquivo de imagem válido.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError("A imagem é muito grande (máx. 10MB).")
      return
    }
    setImageLoading(true)
    setImageError(null)
    try {
      const dataUrl = await compressImageToFit(file)
      setForm({ ...form, image: dataUrl })
    } catch {
      setImageError("Não foi possível processar a imagem.")
    } finally {
      setImageLoading(false)
    }
  }

  function removeImage() {
    setForm({ ...form, image: "" })
    setImageError(null)
  }

  async function saveRecipeLink(productId: string, recipeId: string) {
    const prev = recipeByProduct[productId]
    if (prev && prev.id !== recipeId) {
      await repository.recipes.update(prev.id, { productId: null })
    }
    if (recipeId) {
      await repository.recipes.update(recipeId, { productId })
    }
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
    let productId: string
    if (editingItem) {
      await repository.products.update(editingItem.id, payload)
      productId = editingItem.id
    } else {
      const created = await repository.products.create(payload)
      productId = created.id
    }
    await saveRecipeLink(productId, form.recipeId)
    setShowModal(false)
    resetForm()
    await invalidate()
    queryClient.invalidateQueries({ queryKey: ["recipes"] })
  }

  async function handleDelete(id: string) {
    if (
      !(await confirm(
        "Excluir este produto?",
        "O produto sairá do catálogo em todos os dispositivos (vendas históricas são preservadas).",
      ))
    )
      return
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
    .filter((p: Product) =>
      query
        ? p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
        : true,
    )

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
            <p className="text-sm text-muted">
              {activeCount} ativo(s) · {products.length - activeCount} inativo(s)
            </p>
          </div>
          {canEdit && (
            <Button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
            >
              <Plus className="w-4 h-4" />
              Novo Produto
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <Input
              type="text"
              placeholder="Buscar por nome, SKU ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3"
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

        {error && <ErrorState message={error} onRetry={invalidate} />}

        {loading ? (
          <Card padded={false} className="overflow-hidden">
            <Table>
              <THead className="border-b border-line">
                <Tr>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Th key={i}>
                      <Skeleton className="h-3 w-16" />
                    </Th>
                  ))}
                </Tr>
              </THead>
              <TBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Tr key={i}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </Td>
                    <Td>
                      <Skeleton className="h-4 w-14" />
                    </Td>
                    <Td>
                      <Skeleton className="h-4 w-14" />
                    </Td>
                    <Td>
                      <Skeleton className="h-4 w-14" />
                    </Td>
                    <Td>
                      <Skeleton className="h-4 w-16 mx-auto" />
                    </Td>
                    <Td>
                      <div className="flex justify-center gap-1">
                        <Skeleton className="h-7 w-7" />
                        <Skeleton className="h-7 w-7" />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">
            {products.length === 0
              ? 'Nenhum produto cadastrado. Clique em "Novo Produto" para começar.'
              : "Nenhum produto encontrado com os filtros atuais."}
          </div>
        ) : (
          <Card padded={false} className="overflow-hidden">
            <Table>
              <THead className="border-b border-line">
                <Tr>
                  <Th>Produto</Th>
                  <Th>Categoria</Th>
                  <Th className="text-right">Preço</Th>
                  <Th className="text-right">Custo</Th>
                  <Th className="text-right">Margem</Th>
                  <Th className="text-center">Status</Th>
                  <Th className="text-center">Ações</Th>
                </Tr>
              </THead>
              <TBody>
                {filtered.map((p: Product) => (
                  <Tr key={p.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center shrink-0">
                          {resolveProductImage(p, recipeByProduct[p.id]) ? (
                            <NextImage
                              src={resolveProductImage(p, recipeByProduct[p.id])!}
                              alt={p.name}
                              width={32}
                              height={32}
                              unoptimized
                              className="w-8 h-8 rounded-lg object-cover"
                            />
                          ) : (
                            <Cookie className="w-4 h-4 text-muted" strokeWidth={1.5} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{p.name}</p>
                          <p className="text-xs text-muted">{p.sku}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-sm text-muted">{p.category}</Td>
                    <Td className="text-sm font-semibold text-ink text-right">{formatBRL(p.price)}</Td>
                    <Td className="text-sm text-ink text-right">{formatBRL(p.cost)}</Td>
                    <Td className="text-sm text-ink text-right">
                      {Number.isFinite(p.margin) ? `${p.margin.toFixed(1)}%` : "—"}
                    </Td>
                    <Td className="text-center">
                      {canEdit ? (
                        <button
                          onClick={() => handleToggleActive(p)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${p.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-kraft/20 text-muted hover:bg-kraft/40"}`}
                        >
                          {p.active ? "Ativo" : "Inativo"}
                        </button>
                      ) : (
                        <Badge variant={p.active ? "success" : "neutral"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                      )}
                    </Td>
                    <Td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              aria-label="Editar"
                              className="p-1.5 rounded-md hover:bg-cream text-muted"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
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
        )}

        {showModal && (
          <Modal
            open={showModal}
            onClose={() => {
              setShowModal(false)
              resetForm()
            }}
            title={editingItem ? "Editar Produto" : "Novo Produto"}
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
                  Salvar
                </Button>
              </div>
            }
          >
            <div className="p-4 space-y-4">
              <FormField label="Nome" required>
                <Input
                  type="text"
                  placeholder="Ex: Cookie Clássico"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="SKU" required>
                  <Input
                    type="text"
                    placeholder="Ex: ck-classico"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </FormField>
                <FormField label="Unidade">
                  <Input
                    type="text"
                    placeholder="Ex: un, cx, kg"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  />
                </FormField>
              </div>
              <FormField label="Categoria" required>
                <select
                  id="sel-nome-label-input-type-text-placeholder-e"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
                >
                  <option value="">Selecione uma categoria</option>
                  <option value="Assados">Assados</option>
                  <option value="Congelados">Congelados</option>
                </select>
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Preço (R$)" required>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </FormField>
                <FormField label="Custo (R$)" required>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  />
                </FormField>
              </div>
              <div>
                <label
                  htmlFor="sel-receita-vinculada-opcional"
                  className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5"
                >
                  Receita vinculada (opcional)
                </label>
                <select
                  id="sel-receita-vinculada-opcional"
                  value={form.recipeId}
                  onChange={(e) => setForm({ ...form, recipeId: e.target.value })}
                  className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors bg-paper"
                >
                  <option value="">Nenhuma receita</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {linkedRecipe?.image && !form.image && (
                  <p className="text-xs text-muted mt-1.5">
                    Usando foto da receita: <span className="text-ink font-medium">{linkedRecipe.name}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                  Foto do produto
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-cream border border-line flex items-center justify-center shrink-0">
                    {form.image ? (
                      <NextImage
                        src={form.image}
                        alt="Prévia do produto"
                        width={80}
                        height={80}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    ) : linkedRecipe?.image ? (
                      <NextImage
                        src={linkedRecipe.image}
                        alt={`Foto da receita ${linkedRecipe.name}`}
                        width={80}
                        height={80}
                        unoptimized
                        className="w-full h-full object-cover opacity-70"
                      />
                    ) : (
                      <ImagePlus className="w-6 h-6 text-kraft" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 h-9 px-3 rounded-lg border border-line text-xs font-medium text-ink hover:bg-cream transition-colors cursor-pointer">
                      <ImagePlus className="w-4 h-4" />
                      {imageLoading ? "Processando..." : form.image ? "Trocar foto" : "Enviar foto"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        disabled={imageLoading}
                      />
                    </label>
                    {form.image && (
                      <button
                        type="button"
                        onClick={removeImage}
                        className="flex items-center gap-1 text-xs font-medium text-danger hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remover foto
                      </button>
                    )}
                  </div>
                </div>
                {imageError && <p className="text-xs text-danger mt-2">{imageError}</p>}
              </div>
              <div className="flex items-center justify-between bg-cream border border-line rounded-lg px-3 py-2.5">
                <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="accent-ink w-4 h-4"
                  />
                  Produto ativo no catálogo
                </label>
                <span className="text-xs text-muted">
                  {Number.isFinite(previewMargin) ? `Margem: ${previewMargin.toFixed(1)}%` : "Informe preço e custo"}
                </span>
              </div>
            </div>
          </Modal>
        )}
      </div>
      {dialog}
    </AppShell>
  )
}
