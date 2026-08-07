"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useConfirm } from "@/hooks/useConfirm"
import { useRole } from "@/hooks/useRole"
import { useQueryData } from "@/hooks/useQueryData"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/ErrorState"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { FormField } from "@/components/ui/FormField"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table"
import { repository } from "@/lib/repository"
import { formatBRL } from "@/lib/utils"
import type { PriceTier, Product } from "@/lib/entity-types"
import { Plus, Trash2, Edit, Eye, Settings2, Megaphone, Percent, Save } from "lucide-react"

const CAMPAIGN_TYPE_LABEL: Record<string, string> = {
  PROMOTIONAL: "Promocional",
  SEASONAL: "Sazonal",
  FLASH_SALE: "Liquidação relâmpago",
  LOYALTY: "Fidelidade",
  CUSTOM: "Customizada",
}

const CUSTOMER_TYPES = ["CLIENTE", "B2B", "EMPRESA", "SUBSCRIBER"]

export default function PrecificacaoPage() {
  const [tab, setTab] = useState<"geral" | "campanhas" | "faixas">("geral")

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Precificação</h1>
          <p className="text-sm text-muted">Configurações de preços, campanhas e faixas por volume</p>
        </div>

        <div className="flex gap-2 border-b border-line pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab("geral")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shrink-0 ${
              tab === "geral" ? "bg-ink text-paper" : "text-muted hover:bg-cream"
            }`}
          >
            Geral
          </button>
          <button
            type="button"
            onClick={() => setTab("campanhas")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shrink-0 ${
              tab === "campanhas" ? "bg-ink text-paper" : "text-muted hover:bg-cream"
            }`}
          >
            Campanhas
          </button>
          <button
            type="button"
            onClick={() => setTab("faixas")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shrink-0 ${
              tab === "faixas" ? "bg-ink text-paper" : "text-muted hover:bg-cream"
            }`}
          >
            Faixas de preço
          </button>
        </div>

        {tab === "geral" ? (
          <SettingsTab />
        ) : tab === "campanhas" ? (
          <CampaignsTab />
        ) : (
          <PriceTiersTab />
        )}
      </div>
    </AppShell>
  )
}

type Settings = {
  activatePriceTier: boolean
  activateCoupon: boolean
  activateCampaign: boolean
  activateB2B: boolean
  activateFreeShipping: boolean
  b2bDiscountPercent: number
  activateLoyalty: boolean
  pointsPerReal: number
  minOrderTotalForPoints: number
  roundingMode: "FLOOR" | "CEIL" | "ROUND"
}

const DEFAULT_SETTINGS: Settings = {
  activatePriceTier: false,
  activateCoupon: false,
  activateCampaign: false,
  activateB2B: false,
  activateFreeShipping: false,
  b2bDiscountPercent: 0,
  activateLoyalty: true,
  pointsPerReal: 1,
  minOrderTotalForPoints: 0,
  roundingMode: "FLOOR",
}

function SettingsTab() {
  const { isAdmin } = useRole()
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const ignoreRef = useRef(false)

  const load = useCallback(async () => {
    try {
      const resp = await fetch("/api/pricing-settings")
      if (!resp.ok) throw new Error("Erro ao carregar configurações")
      const data = (await resp.json()) as Partial<Settings>
      if (ignoreRef.current) return
      setSettings({ ...DEFAULT_SETTINGS, ...data })
      setError(null)
    } catch (e) {
      if (ignoreRef.current) return
      setError(e instanceof Error ? e.message : "Erro ao carregar configurações")
    } finally {
      if (!ignoreRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    ignoreRef.current = false
    const timer = setTimeout(() => void load(), 0)
    return () => {
      clearTimeout(timer)
      ignoreRef.current = true
    }
  }, [isAdmin, load])

  if (!isAdmin) {
    return (
      <Card className="p-8 text-center">
        <Eye className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-sm text-muted">Apenas administradores podem configurar a precificação.</p>
      </Card>
    )
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const resp = await fetch("/api/pricing-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => null)
        alert(data?.error || "Erro ao salvar configurações")
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  function toggle(key: keyof Settings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function row(label: string, description: string, checked: boolean, onToggle: () => void) {
    return (
      <div className="flex items-center justify-between border border-line rounded-lg p-3">
        <div>
          <p className="text-sm font-medium text-ink">{label}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="w-5 h-5 accent-ink"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Settings2 className="w-4 h-4 text-muted" strokeWidth={1.5} />
          Regras ativas
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs font-medium text-success">Salvo!</span>}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" /> Salvar
          </Button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} padded={false} className="p-3">
              <Skeleton className="h-4 w-48 mb-1" />
              <Skeleton className="h-3 w-64" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {row(
            "Preços por faixa (tiers)",
            "Aplica desconto por volume segundo a tabela de faixas",
            settings.activatePriceTier,
            () => toggle("activatePriceTier"),
          )}
          {row(
            "Cupons de desconto",
            "Aceita cupons no checkout quando o cliente informa um código",
            settings.activateCoupon,
            () => toggle("activateCoupon"),
          )}
          {row(
            "Campanhas promocionais",
            "Aplica descontos de campanhas ativas automaticamente",
            settings.activateCampaign,
            () => toggle("activateCampaign"),
          )}
          {row(
            "Desconto B2B",
            "Aplica desconto percentual para clientes empresariais",
            settings.activateB2B,
            () => toggle("activateB2B"),
          )}
          {row(
            "Frete grátis automático",
            "Habilita regras de frete grátis por limite de pedido",
            settings.activateFreeShipping,
            () => toggle("activateFreeShipping"),
          )}
          {row(
            "Pontos de fidelidade",
            "Acumula pontos por valor gasto no pedido",
            settings.activateLoyalty,
            () => toggle("activateLoyalty"),
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={settings.activateB2B ? "" : "opacity-50 pointer-events-none"}>
          <FormField label="Desconto B2B (%)">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={String(settings.b2bDiscountPercent ?? 0)}
              onChange={(e) => setSettings({ ...settings, b2bDiscountPercent: parseFloat(e.target.value) || 0 })}
            />
          </FormField>
        </div>
        <div className={settings.activateLoyalty ? "" : "opacity-50 pointer-events-none"}>
          <FormField label="Pontos por real">
            <Input
              type="number"
              min="0"
              step="0.1"
              value={String(settings.pointsPerReal ?? 1)}
              onChange={(e) => setSettings({ ...settings, pointsPerReal: parseFloat(e.target.value) || 0 })}
            />
          </FormField>
        </div>
        <div className={settings.activateLoyalty ? "" : "opacity-50 pointer-events-none"}>
          <FormField label="Mínimo p/ pontos (R$)">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={String(settings.minOrderTotalForPoints ?? 0)}
              onChange={(e) => setSettings({ ...settings, minOrderTotalForPoints: parseFloat(e.target.value) || 0 })}
            />
          </FormField>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Arredondamento">
          <select
            value={settings.roundingMode}
            onChange={(e) => setSettings({ ...settings, roundingMode: e.target.value as Settings["roundingMode"] })}
            className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
          >
            <option value="FLOOR">Para baixo (FLOOR)</option>
            <option value="CEIL">Para cima (CEIL)</option>
            <option value="ROUND">Arredondar (ROUND)</option>
          </select>
        </FormField>
      </div>
    </div>
  )
}

type Campaign = {
  id: string
  name: string
  description: string | null
  type: string
  priority: number
  startDate: string
  endDate: string | null
  active: boolean
  usedCount: number
  applicableProducts: string[]
  conditions: {
    discountPercent?: number
    discountFixed?: number
    minQty?: number
    minOrderValue?: number
    products?: string[]
    categories?: string[]
    customerTypes?: string[]
  }
}

type CampaignForm = {
  name: string
  description: string
  type: string
  priority: string
  startDate: string
  endDate: string
  active: boolean
  discountPercent: string
  minQty: string
  minOrderValue: string
  categories: string[]
  customerTypes: string[]
}

const EMPTY_CAMPAIGN_FORM: CampaignForm = {
  name: "",
  description: "",
  type: "PROMOTIONAL",
  priority: "0",
  startDate: "",
  endDate: "",
  active: true,
  discountPercent: "",
  minQty: "",
  minOrderValue: "",
  categories: [],
  customerTypes: [],
}

function dateKeyOf(d: string | null | undefined): string {
  if (!d) return ""
  return d.slice(0, 10)
}

function CampaignsTab() {
  const { isAdmin } = useRole()
  const { confirm, dialog } = useConfirm()
  const { data: products, error: productsError } = useQueryData("products")

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const ignoreRef = useRef(false)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [form, setForm] = useState<CampaignForm>(EMPTY_CAMPAIGN_FORM)
  const [formError, setFormError] = useState("")

  const categories = useMemo(
    () => Array.from(new Set(products.map((p: Product) => p.category).filter(Boolean))).sort(),
    [products],
  )

  const load = useCallback(async () => {
    try {
      const resp = await fetch("/api/campaigns")
      if (!resp.ok) throw new Error("Erro ao carregar campanhas")
      const data = (await resp.json()) as Campaign[]
      if (ignoreRef.current) return
      setCampaigns(data)
      setError(null)
    } catch (e) {
      if (ignoreRef.current) return
      setError(e instanceof Error ? e.message : "Erro ao carregar campanhas")
    } finally {
      if (!ignoreRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    ignoreRef.current = false
    const timer = setTimeout(() => void load(), 0)
    return () => {
      clearTimeout(timer)
      ignoreRef.current = true
    }
  }, [isAdmin, load])

  if (!isAdmin) {
    return (
      <Card className="p-8 text-center">
        <Megaphone className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-sm text-muted">Apenas administradores podem gerenciar campanhas.</p>
      </Card>
    )
  }

  function openCreate() {
    setForm({ ...EMPTY_CAMPAIGN_FORM, startDate: new Date().toISOString().slice(0, 10) })
    setEditing(null)
    setFormError("")
    setShowModal(true)
  }

  function openEdit(campaign: Campaign) {
    setForm({
      name: campaign.name,
      description: campaign.description || "",
      type: campaign.type,
      priority: String(campaign.priority ?? 0),
      startDate: dateKeyOf(campaign.startDate),
      endDate: dateKeyOf(campaign.endDate),
      active: campaign.active,
      discountPercent: campaign.conditions?.discountPercent != null ? String(campaign.conditions.discountPercent) : "",
      minQty: campaign.conditions?.minQty != null ? String(campaign.conditions.minQty) : "",
      minOrderValue:
        campaign.conditions?.minOrderValue != null ? String(campaign.conditions.minOrderValue) : "",
      categories: campaign.conditions?.categories ?? [],
      customerTypes: campaign.conditions?.customerTypes ?? [],
    })
    setEditing(campaign)
    setFormError("")
    setShowModal(true)
  }

  function toggleChip(key: "categories" | "customerTypes", value: string) {
    setForm((prev) => {
      const has = prev[key].includes(value)
      return { ...prev, [key]: has ? prev[key].filter((v) => v !== value) : [...prev[key], value] }
    })
  }

  async function handleSave() {
    setFormError("")
    if (!form.name.trim()) {
      setFormError("Nome é obrigatório")
      return
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type,
      priority: parseInt(form.priority) || 0,
      startDate: form.startDate || undefined,
      endDate: form.endDate || null,
      active: form.active,
      conditions: {
        ...(form.discountPercent !== "" && { discountPercent: parseFloat(form.discountPercent) || 0 }),
        ...(form.minQty !== "" && { minQty: parseInt(form.minQty) || 0 }),
        ...(form.minOrderValue !== "" && { minOrderValue: parseFloat(form.minOrderValue) || 0 }),
        ...(form.categories.length && { categories: form.categories }),
        ...(form.customerTypes.length && { customerTypes: form.customerTypes }),
      },
    }
    const url = editing ? `/api/campaigns/${editing.id}` : "/api/campaigns"
    const method = editing ? "PUT" : "POST"
    const resp = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      const issue = data?.details?.[0]?.message
      setFormError(data?.error + (issue ? `: ${issue}` : "") || "Erro ao salvar campanha")
      return
    }
    setShowModal(false)
    await load()
  }

  async function handleToggle(campaign: Campaign) {
    await fetch(`/api/campaigns/${campaign.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !campaign.active }),
    })
    await load()
  }

  async function handleDelete(campaign: Campaign) {
    if (!(await confirm(`Excluir a campanha "${campaign.name}"?`))) return
    const resp = await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      alert(data?.error || "Erro ao excluir campanha")
      return
    }
    await load()
  }

  function conditionSummary(c: Campaign) {
    const parts: string[] = []
    if (c.conditions?.discountPercent != null) parts.push(`${c.conditions.discountPercent}% off`)
    if (c.conditions?.discountFixed != null) parts.push(`R$ ${c.conditions.discountFixed} off`)
    if (c.conditions?.minQty != null) parts.push(`mín ${c.conditions.minQty} un`)
    if (c.conditions?.minOrderValue != null) parts.push(`pedido ≥ R$ ${c.conditions.minOrderValue}`)
    if (c.conditions?.categories?.length) parts.push(`cats: ${c.conditions.categories.join(", ")}`)
    if (c.conditions?.customerTypes?.length) parts.push(`clientes: ${c.conditions.customerTypes.join(", ")}`)
    return parts.length ? parts.join(" · ") : "Sem condições"
  }

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Megaphone className="w-4 h-4 text-muted" strokeWidth={1.5} />
          {campaigns.length} campanha(s)
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> Nova Campanha
        </Button>
      </div>

      {(error || productsError) && <ErrorState message={error || "Erro ao carregar campanhas"} onRetry={load} />}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padded={false} className="p-4">
              <Skeleton className="h-4 w-40 mb-2" />
              <Skeleton className="h-3 w-64" />
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-10 text-muted border border-dashed border-line rounded-lg">
          <Megaphone className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm">Nenhuma campanha cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} padded={false}>
              <div className="flex items-start gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-ink">{campaign.name}</p>
                    <Badge variant={campaign.active ? "success" : "neutral"}>
                      {campaign.active ? "Ativa" : "Inativa"}
                    </Badge>
                    <Badge variant="info">{CAMPAIGN_TYPE_LABEL[campaign.type] || campaign.type}</Badge>
                    {campaign.priority > 0 && <Badge variant="warning">prioridade {campaign.priority}</Badge>}
                  </div>
                  {campaign.description && <p className="text-xs text-muted mt-0.5">{campaign.description}</p>}
                  <p className="text-xs text-muted mt-1">{conditionSummary(campaign)}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {dateKeyOf(campaign.startDate) || "?"} a {dateKeyOf(campaign.endDate) || "∞"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => handleToggle(campaign)} aria-label="Ativar/desativar">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(campaign)} aria-label="Editar campanha">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(campaign)}
                    aria-label="Excluir campanha"
                  >
                    <span className="text-danger">
                      <Trash2 className="w-4 h-4" />
                    </span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          open
          onClose={() => setShowModal(false)}
          title={editing ? `Editar campanha ${editing.name}` : "Nova campanha"}
          size="lg"
          footer={
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                Salvar
              </Button>
            </div>
          }
        >
          <div className="p-4 space-y-4">
            {formError && <p className="text-sm text-danger">{formError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Nome" required>
                <Input
                  type="text"
                  placeholder="Ex.: Black Friday"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </FormField>
              <FormField label="Tipo">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
                >
                  {Object.entries(CAMPAIGN_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Descrição">
              <Input
                type="text"
                placeholder="Opcional"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </FormField>

            <div className="grid grid-cols-3 gap-3">
              <FormField label="Prioridade">
                <Input
                  type="number"
                  min="0"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                />
              </FormField>
              <FormField label="Início">
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </FormField>
              <FormField label="Fim">
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </FormField>
            </div>

            <div className="border-t border-line pt-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                Condições de desconto
              </p>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Desconto (%)">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0"
                    value={form.discountPercent}
                    onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                  />
                </FormField>
                <FormField label="Qtd mínima (un)">
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.minQty}
                    onChange={(e) => setForm({ ...form, minQty: e.target.value })}
                  />
                </FormField>
                <FormField label="Pedido mínimo (R$)">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.minOrderValue}
                    onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
                  />
                </FormField>
              </div>

              <div className="mt-4">
                <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Categorias</p>
                <div className="flex flex-wrap gap-2">
                  {categories.length ? (
                    categories.map((category) => {
                      const selected = form.categories.includes(category)
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => toggleChip("categories", category)}
                          className={`h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
                            selected ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-cream"
                          }`}
                        >
                          {category}
                        </button>
                      )
                    })
                  ) : (
                    <p className="text-xs text-muted">Nenhuma categoria cadastrada.</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Tipos de cliente</p>
                <div className="flex flex-wrap gap-2">
                  {CUSTOMER_TYPES.map((customerType) => {
                    const selected = form.customerTypes.includes(customerType)
                    return (
                      <button
                        key={customerType}
                        type="button"
                        onClick={() => toggleChip("customerTypes", customerType)}
                        className={`h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
                          selected ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-cream"
                        }`}
                      >
                        {customerType}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border border-line rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-ink">Campanha ativa</p>
                <p className="text-xs text-muted">Inativa, a campanha não é aplicada automaticamente</p>
              </div>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-5 h-5 accent-ink"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
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
  const [form, setForm] = useState({ name: "", minQty: "", maxQty: "", price: "", productId: "" })

  const resetForm = () => setForm({ name: "", minQty: "", maxQty: "", price: "", productId: "" })

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
    resetForm()
    await invalidate()
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Excluir esta faixa de preço?"))) return
    await repository.priceTiers.delete(id)
    await invalidate()
  }

  async function handleToggleEnabled(tier: PriceTier) {
    await repository.priceTiers.update(tier.id, { enabled: tier.enabled !== false ? false : true })
    await invalidate()
  }

  const groups = useMemo(() => {
    const list: { productId: string; name: string; tiers: PriceTier[] }[] = []
    const index = new Map<string, number>()
    for (const t of tiers) {
      const pid = t.productId || "sem-produto"
      const existing = index.has(pid) ? list[index.get(pid)!] : undefined
      if (existing) {
        existing.tiers.push(t)
        continue
      }
      const display = products.find((p: Product) => p.id === t.productId)?.name
      const group = { productId: pid, name: display || "Outros", tiers: [t] }
      index.set(pid, list.length)
      list.push(group)
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [tiers, products])

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Percent className="w-4 h-4 text-muted" strokeWidth={1.5} />
          Tabela de desconto por volume
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingTier(null)
              resetForm()
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
      ) : groups.length === 0 ? (
        <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">
          Nenhuma faixa de preço cadastrada.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.productId} padded={false} className="overflow-hidden">
              <div className="px-4 py-3 bg-cream border-b border-line">
                <p className="text-sm font-semibold text-ink">{group.name}</p>
              </div>
              <Table>
                <THead>
                  <Tr>
                    <Th>Faixa</Th>
                    <Th className="text-right">Qtd Mín</Th>
                    <Th className="text-right">Qtd Máx</Th>
                    <Th className="text-right">Preço/Un</Th>
                    <Th className="text-right">Total (Qtd mín)</Th>
                    <Th className="text-center">Ativa</Th>
                    <Th className="text-center">Ações</Th>
                  </Tr>
                </THead>
                <TBody>
                  {group.tiers.map((tier: PriceTier) => (
                    <Tr key={tier.id}>
                      <Td className="text-sm font-medium text-ink">{tier.name}</Td>
                      <Td className="text-sm text-right text-muted">{tier.minQty}</Td>
                      <Td className="text-sm text-right text-muted">{tier.maxQty || "∞"}</Td>
                      <Td className="text-sm text-right text-muted">{formatBRL(Number(tier.price) || 0)}</Td>
                      <Td className="text-sm font-semibold text-ink text-right">
                        {formatBRL((Number(tier.price) || 0) * (tier.minQty || 0))}
                      </Td>
                      <Td className="text-center">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleToggleEnabled(tier)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                              tier.enabled !== false
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-kraft/20 text-muted hover:bg-kraft/40"
                            }`}
                          >
                            {tier.enabled !== false ? "Ativa" : "Inativa"}
                          </button>
                        ) : (
                          <Badge variant={tier.enabled !== false ? "success" : "neutral"}>
                            {tier.enabled !== false ? "Ativa" : "Inativa"}
                          </Badge>
                        )}
                      </Td>
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
          ))}
        </div>
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
                id="sel-produto-faixa"
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
