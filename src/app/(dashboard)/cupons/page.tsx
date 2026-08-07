"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useConfirm } from "@/hooks/useConfirm"
import { useRole } from "@/hooks/useRole"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/ErrorState"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { FormField } from "@/components/ui/FormField"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Plus, Trash2, Edit, Eye, Ticket } from "lucide-react"

type Coupon = {
  id: string
  code: string
  name: string
  description: string | null
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING" | "BUY_X_GET_Y"
  value: string
  minOrderValue: string
  maxDiscount: string | null
  usageLimit: number
  usedCount: number
  validFrom: string
  validUntil: string | null
  active: boolean
  applicableProducts: string[]
  applicableTypes: string[]
}

const CHANNEL_OPTIONS = ["all", "delivery", "pickup", "digital"]

const TYPE_LABEL: Record<Coupon["type"], string> = {
  PERCENTAGE: "%",
  FIXED_AMOUNT: "R$",
  FREE_SHIPPING: "Frete grátis",
  BUY_X_GET_Y: "Compre X, leve Y",
}

function dateKeyOf(d: string | null | undefined): string {
  if (!d) return ""
  return d.slice(0, 10)
}

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(url)
  if (!resp.ok) {
    const data = await resp.json().catch(() => null)
    if (resp.status === 401) throw new Error("Sessão expirada. Faça login novamente.")
    if (resp.status === 500) throw new Error("Erro no servidor ao carregar cupons. Tente novamente.")
    throw new Error(data?.error || "Erro na requisição")
  }
  return resp.json()
}

type CouponForm = {
  code: string
  name: string
  description: string
  type: Coupon["type"]
  value: string
  minOrderValue: string
  maxDiscount: string
  usageLimit: string
  validFrom: string
  validUntil: string
  active: boolean
  applicableTypes: string[]
}

const EMPTY_COUPON_FORM: CouponForm = {
  code: "",
  name: "",
  description: "",
  type: "PERCENTAGE",
  value: "",
  minOrderValue: "",
  maxDiscount: "",
  usageLimit: "1",
  validFrom: "",
  validUntil: "",
  active: true,
  applicableTypes: ["all"],
}

export default function CuponsPage() {
  const { isAdmin } = useRole()
  const { confirm, dialog } = useConfirm()

  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const ignoreRef = useRef(false)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [form, setForm] = useState<CouponForm>(EMPTY_COUPON_FORM)
  const [formError, setFormError] = useState("")

  const load = useCallback(async () => {
    try {
      const c = await fetchJson<Coupon[]>("/api/coupons")
      if (ignoreRef.current) return
      setCoupons(c)
      setError(null)
    } catch (e) {
      if (ignoreRef.current) return
      setError(e instanceof Error ? e.message : "Erro ao carregar cupons")
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
      <AppShell>
        <Card className="p-8 text-center">
          <Eye className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-muted">Apenas administradores podem gerenciar cupons.</p>
        </Card>
      </AppShell>
    )
  }

  function openCreate() {
    setForm({ ...EMPTY_COUPON_FORM, validFrom: new Date().toISOString().slice(0, 10) })
    setEditing(null)
    setFormError("")
    setShowModal(true)
  }

  function openEdit(coupon: Coupon) {
    setForm({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || "",
      type: coupon.type,
      value: String(coupon.value),
      minOrderValue: String(coupon.minOrderValue || ""),
      maxDiscount: coupon.maxDiscount != null ? String(coupon.maxDiscount) : "",
      usageLimit: String(coupon.usageLimit),
      validFrom: dateKeyOf(coupon.validFrom),
      validUntil: dateKeyOf(coupon.validUntil),
      active: coupon.active,
      applicableTypes: coupon.applicableTypes?.length ? coupon.applicableTypes : ["all"],
    })
    setEditing(coupon)
    setFormError("")
    setShowModal(true)
  }

  function toggleType(value: string) {
    setForm((prev) => {
      const has = prev.applicableTypes.includes(value)
      if (value === "all") return { ...prev, applicableTypes: has ? [] : ["all"] }
      const next = prev.applicableTypes.filter((t) => t !== "all")
      if (has) return { ...prev, applicableTypes: next }
      return { ...prev, applicableTypes: [...next, value] }
    })
  }

  async function handleSave() {
    setFormError("")
    if (!form.code.trim() || !form.name.trim()) {
      setFormError("Código e nome são obrigatórios")
      return
    }
    if (!form.value) {
      setFormError("Informe o valor do cupom")
      return
    }
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type,
      value: parseFloat(form.value) || 0,
      minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : 0,
      maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
      usageLimit: parseInt(form.usageLimit) || 1,
      validFrom: form.validFrom || undefined,
      validUntil: form.validUntil || null,
      active: form.active,
      applicableTypes: form.applicableTypes.length ? form.applicableTypes : ["all"],
    }
    const url = editing ? `/api/coupons/${editing.id}` : "/api/coupons"
    const method = editing ? "PUT" : "POST"
    const resp = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      const issue = data?.details?.[0]?.message
      setFormError(data?.error + (issue ? `: ${issue}` : "") || "Erro ao salvar cupom")
      return
    }
    setShowModal(false)
    await load()
  }

  async function handleToggle(coupon: Coupon) {
    const resp = await fetch(`/api/coupons/${coupon.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !coupon.active }),
    })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      alert(data?.error || "Erro ao atualizar cupom")
      return
    }
    await load()
  }

  async function handleDelete(coupon: Coupon) {
    if (!(await confirm(`Excluir o cupom "${coupon.code}"?`))) return
    const resp = await fetch(`/api/coupons/${coupon.id}`, { method: "DELETE" })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      alert(data?.error || "Erro ao excluir cupom")
      return
    }
    await load()
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Cupons</h1>
            <p className="text-sm text-muted">{coupons.length} cupom(ns) cadastrados</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Novo Cupom
          </Button>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padded={false} className="p-4">
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-3 w-64" />
              </Card>
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-10 text-muted border border-dashed border-line rounded-lg">
            <Ticket className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-sm">Nenhum cupom cadastrado.</p>
          </div>
        ) : (
          <Card padded={false}>
            <div className="divide-y divide-line">
              {coupons.map((coupon) => {
                const used = coupon.usedCount >= coupon.usageLimit
                const expired =
                  coupon.validUntil != null &&
                  coupon.validUntil.slice(0, 10) < new Date().toISOString().slice(0, 10)
                return (
                  <div key={coupon.id} className="flex items-start gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-ink">{coupon.code}</p>
                        <Badge variant={coupon.active ? "success" : "neutral"}>
                          {coupon.active ? "Ativo" : "Inativo"}
                        </Badge>
                        {used && <Badge variant="warning">Esgotado</Badge>}
                        {expired && <Badge variant="danger">Vencido</Badge>}
                        <Badge variant="info">{coupon.type}</Badge>
                      </div>
                      <p className="text-sm text-ink mt-0.5">
                        {coupon.name} · {TYPE_LABEL[coupon.type]} {coupon.value}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Pedido mínimo: R$ {coupon.minOrderValue} · Usos: {coupon.usedCount}/{coupon.usageLimit} ·{" "}
                        {dateKeyOf(coupon.validFrom)} a {dateKeyOf(coupon.validUntil) || "sem prazo"}
                      </p>
                      {coupon.applicableTypes?.length ? (
                        <p className="text-[11px] text-muted mt-1">
                          Canais: {coupon.applicableTypes.join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleToggle(coupon)} aria-label="Ativar/desativar">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(coupon)} aria-label="Editar cupom">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon)} aria-label="Excluir cupom">
                        <span className="text-danger">
                          <Trash2 className="w-4 h-4" />
                        </span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {showModal && (
          <Modal
            open
            onClose={() => setShowModal(false)}
            title={editing ? `Editar cupom ${editing.code}` : "Novo cupom"}
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
                <FormField label="Código" required>
                  <Input
                    type="text"
                    placeholder="Ex.: BEMVINDO10"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  />
                </FormField>
                <FormField label="Nome" required>
                  <Input
                    type="text"
                    placeholder="Ex.: Boas-vindas"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
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

              <FormField label="Tipo de desconto">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as Coupon["type"] })}
                  className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
                >
                  <option value="PERCENTAGE">Porcentagem (%)</option>
                  <option value="FIXED_AMOUNT">Valor fixo (R$)</option>
                  <option value="FREE_SHIPPING">Frete grátis</option>
                  <option value="BUY_X_GET_Y">Compre X, leve Y</option>
                </select>
              </FormField>

              <div className="grid grid-cols-3 gap-3">
                <FormField label={form.type === "PERCENTAGE" ? "Valor (%)" : "Valor (R$)"} required>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                  />
                </FormField>
                <FormField label="Pedido mínimo (R$)">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.minOrderValue}
                    onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
                  />
                </FormField>
                <FormField label="Desconto máx. (R$)">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Opcional"
                    value={form.maxDiscount}
                    onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormField label="Limite de usos">
                  <Input
                    type="number"
                    min="1"
                    value={form.usageLimit}
                    onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                  />
                </FormField>
                <FormField label="Válido a partir de">
                  <Input
                    type="date"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                  />
                </FormField>
                <FormField label="Válido até">
                  <Input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                  />
                </FormField>
              </div>

              <div>
                <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Canais válidos</p>
                <div className="flex flex-wrap gap-2">
                  {CHANNEL_OPTIONS.map((channel) => {
                    const selected = form.applicableTypes.includes(channel)
                    return (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => toggleType(channel)}
                        className={`h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
                          selected ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-cream"
                        }`}
                      >
                        {channel}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[11px] text-muted mt-1">Selecione &quot;all&quot; para valer em todos os canais.</p>
              </div>

              <div className="flex items-center justify-between border border-line rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-ink">Cupom ativo</p>
                  <p className="text-xs text-muted">Inativo, o cupom não é aceito no checkout</p>
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
      {dialog}
    </AppShell>
  )
}
