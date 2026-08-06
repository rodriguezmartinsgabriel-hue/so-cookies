"use client"

import { useState, useEffect, useCallback } from "react"
import { useConfirm } from "@/hooks/useConfirm"
import { useFocusTrap } from "@/hooks/useFocusTrap"
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
import { Plus, Store, Trash2, Edit, Copy, Check, Plug, AlertTriangle, Eye, ChevronDown } from "lucide-react"

type Account = {
  id: string
  platform: "99FOOD" | "IFOOD"
  storeName: string | null
  enabled: boolean
  lastSyncAt: string | null
  lastError: string | null
  createdAt: string
  webhookUrl?: string
  credentials: { appId?: string; appShoppId?: string; clientId?: string }
}

const PLATFORM_LABEL: Record<string, string> = { "99FOOD": "99Food", IFOOD: "iFood" }

type CredForm = { appId: string; appShoppId: string; clientId: string; clientSecret: string }

const EMPTY_CRED: CredForm = { appId: "", appShoppId: "", clientId: "", clientSecret: "" }

async function fetchAccountsData(): Promise<{ accounts?: Account[]; error?: string }> {
  try {
    const resp = await fetch("/api/integrations/accounts")
    if (resp.ok) return { accounts: (await resp.json()) as Account[] }
    const data = (await resp.json().catch(() => null)) as { error?: string } | null
    return { error: data?.error || "Erro ao carregar contas" }
  } catch {
    return { error: "Erro ao carregar contas" }
  }
}

export default function IntegracoesPage() {
  const { isAdmin } = useRole()
  const { confirm, dialog } = useConfirm()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const createRef = useFocusTrap(showCreate)
  const [showEdit, setShowEdit] = useState(false)
  const editRef = useFocusTrap(showEdit)
  const [editing, setEditing] = useState<Account | null>(null)

  const [form, setForm] = useState({ platform: "99FOOD", storeName: "", enabled: true })
  const [formCred, setFormCred] = useState<CredForm>(EMPTY_CRED)
  const [editForm, setEditForm] = useState({ storeName: "", enabled: true })
  const [editCred, setEditCred] = useState<CredForm>(EMPTY_CRED)

  const loadAccounts = useCallback(async () => {
    const result = await fetchAccountsData()
    if (result.accounts) setAccounts(result.accounts)
    else setError(result.error || "Erro ao carregar contas")
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    let ignore = false
    async function startFetching() {
      const result = await fetchAccountsData()
      if (ignore) return
      if (result.accounts) setAccounts(result.accounts)
      else setError(result.error || "Erro ao carregar contas")
      setLoading(false)
    }
    startFetching()
    return () => {
      ignore = true
    }
  }, [isAdmin])

  function resetForm() {
    setForm({ platform: "99FOOD", storeName: "", enabled: true })
    setFormCred(EMPTY_CRED)
  }

  function openEdit(acc: Account) {
    setEditing(acc)
    setEditForm({ storeName: acc.storeName || "", enabled: acc.enabled })
    setEditCred(EMPTY_CRED)
    setShowEdit(true)
  }

  function buildCredentials(platform: string, cred: CredForm) {
    return platform === "99FOOD"
      ? { appId: cred.appId, appShoppId: cred.appShoppId, clientSecret: cred.clientSecret }
      : { clientId: cred.clientId, clientSecret: cred.clientSecret }
  }

  async function handleCreate() {
    const creds = buildCredentials(form.platform, formCred)
    const payload = { platform: form.platform, storeName: form.storeName, credentials: creds, enabled: form.enabled }
    const resp = await fetch("/api/integrations/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      alert(data?.error || "Erro ao criar conta")
      return
    }
    setShowCreate(false)
    resetForm()
    await loadAccounts()
  }

  async function handleEditSave() {
    if (!editing) return
    const payload: {
      storeName: string
      enabled: boolean
      credentials?:
        { appId: string; appShoppId: string; clientSecret: string } | { clientId: string; clientSecret: string }
    } = { storeName: editForm.storeName, enabled: editForm.enabled }
    if (editCred.clientSecret) {
      const creds = buildCredentials(editing.platform, editCred)
      const required =
        editing.platform === "99FOOD" ? ["appId", "appShoppId", "clientSecret"] : ["clientId", "clientSecret"]
      if (required.some((k) => !(creds as Record<string, string | undefined>)[k])) {
        alert("Preencha todos os campos de credenciais para atualizar, ou deixe em branco para manter.")
        return
      }
      payload.credentials = creds
    }
    const resp = await fetch(`/api/integrations/accounts/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      alert(data?.error || "Erro ao atualizar conta")
      return
    }
    setShowEdit(false)
    setEditing(null)
    await loadAccounts()
  }

  async function handleDelete(acc: Account) {
    if (!(await confirm(`Excluir a conta ${acc.storeName || acc.platform}?`))) return
    const resp = await fetch(`/api/integrations/accounts/${acc.id}`, { method: "DELETE" })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      alert(data?.error || "Erro ao excluir conta")
      return
    }
    await loadAccounts()
  }

  async function handleToggle(acc: Account) {
    const resp = await fetch(`/api/integrations/accounts/${acc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !acc.enabled }),
    })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      alert(data?.error || "Erro ao atualizar conta")
      return
    }
    await loadAccounts()
  }

  async function handleCopy(acc: Account) {
    if (!acc.webhookUrl) return
    try {
      await navigator.clipboard.writeText(acc.webhookUrl)
      setCopiedId(acc.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      alert(acc.webhookUrl)
    }
  }

  const enabledCount = accounts.filter((a) => a.enabled).length

  if (!isAdmin) {
    return (
      <AppShell>
        <Card className="p-8 text-center">
          <Eye className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-muted">Apenas administradores podem gerenciar integrações.</p>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Integrações</h1>
            <p className="text-sm text-muted">
              {accounts.length} conta(s) · {enabledCount} ativa(s) · 99Food e iFood
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm()
              setShowCreate(true)
            }}
          >
            <Plus className="w-4 h-4" />
            Nova Conta
          </Button>
        </div>

        <Button
          variant="secondary"
          className="w-full h-auto py-3 justify-start"
          onClick={() => setShowGuide(!showGuide)}
        >
          <Plug className="w-4 h-4 text-muted" />
          Como configurar os webhooks
          <ChevronDown className={`w-4 h-4 ml-auto text-muted transition-transform ${showGuide ? "rotate-180" : ""}`} />
        </Button>

        {showGuide && (
          <Card className="p-4 space-y-3 text-sm text-muted">
            <p>
              <strong className="text-ink">99Food (Open Delivery):</strong> no painel da 99Food, cadastre o webhook
              apontando para{" "}
              <code className="text-xs bg-cream px-1.5 py-0.5 rounded">{"/api/integrations/99food/webhook"}</code>.
              Evento <code className="text-xs bg-cream px-1.5 py-0.5 rounded">newEvent</code>; headers{" "}
              <code className="text-xs bg-cream px-1.5 py-0.5 rounded">x-app-id</code>,{" "}
              <code className="text-xs bg-cream px-1.5 py-0.5 rounded">x-app-shopp-id</code> e assinatura{" "}
              <code className="text-xs bg-cream px-1.5 py-0.5 rounded">x-app-signature</code> (HMAC-SHA256 do body com o
              Client Secret).
            </p>
            <p>
              <strong className="text-ink">iFood:</strong> no Portal iFood, registre o webhook apontando para{" "}
              <code className="text-xs bg-cream px-1.5 py-0.5 rounded">{"/api/integrations/ifood/webhook"}</code>. A
              assinatura <code className="text-xs bg-cream px-1.5 py-0.5 rounded">X-IFood-Signature</code> é validada
              com o Client Secret da conta.
            </p>
            <p className="text-xs text-muted">
              A resposta ao webhook é 200/202 para reconhecer o evento. Pedidos novos aparecem na aba Delivery com SLA
              de 8 minutos e som de notificação.
            </p>
          </Card>
        )}

        {error && <ErrorState message={error} onRetry={loadAccounts} />}

        {loading && isAdmin ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-3 w-64 mb-2" />
                <Skeleton className="h-3 w-72" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => (
              <Card key={acc.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-8 h-8 rounded-lg bg-ink/5 flex items-center justify-center shrink-0">
                        <Store className="w-4 h-4 text-ink" strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-semibold text-ink">{acc.storeName || "Loja"}</p>
                      <Badge variant="neutral">{PLATFORM_LABEL[acc.platform] || acc.platform}</Badge>
                      <Badge variant={acc.enabled ? "success" : "danger"}>{acc.enabled ? "Ativa" : "Desativada"}</Badge>
                    </div>
                    <p className="text-xs text-muted mt-2">
                      {acc.platform === "99FOOD"
                        ? `App ID: ${acc.credentials.appId || "-"} · Shopp ID: ${acc.credentials.appShoppId || "-"}`
                        : `Client ID: ${acc.credentials.clientId || "-"}`}
                    </p>
                    {acc.webhookUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <code className="text-[11px] bg-cream px-2 py-1 rounded flex-1 truncate">{acc.webhookUrl}</code>
                        <Button variant="secondary" size="sm" onClick={() => handleCopy(acc)} className="shrink-0">
                          {copiedId === acc.id ? (
                            <Check className="w-3 h-3 text-success" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          {copiedId === acc.id ? "Copiado" : "Copiar"}
                        </Button>
                      </div>
                    )}
                    <p className="text-[11px] text-muted mt-2">
                      Última sincronização:{" "}
                      {acc.lastSyncAt ? new Date(acc.lastSyncAt).toLocaleString("pt-BR") : "nunca"}
                    </p>
                    {acc.lastError && (
                      <p className="text-[11px] text-danger mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {acc.lastError}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(acc)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${acc.enabled ? "bg-success" : "bg-line"}`}
                      aria-label={acc.enabled ? "Desativar conta" : "Ativar conta"}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-paper shadow transition-all ${acc.enabled ? "left-[18px]" : "left-0.5"}`}
                      />
                    </button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(acc)} aria-label="Editar">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(acc)} aria-label="Excluir">
                      <span className="text-danger">
                        <Trash2 className="w-4 h-4" />
                      </span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {accounts.length === 0 && (
              <div className="text-center py-10 text-muted border border-dashed border-line rounded-lg">
                Nenhuma conta integrada ainda. Crie uma conta 99Food ou iFood para começar.
              </div>
            )}
          </div>
        )}

        {showCreate && (
          <Modal
            open
            onClose={() => setShowCreate(false)}
            title="Nova Conta"
            size="md"
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleCreate}>
                  Salvar
                </Button>
              </div>
            }
          >
            <div ref={createRef} className="p-4 space-y-4">
              <FormField label="Plataforma">
                <select
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
                >
                  <option value="99FOOD">99Food</option>
                  <option value="IFOOD">iFood</option>
                </select>
              </FormField>
              <FormField label="Nome da Loja" required hint="Identificador da loja no app (único por plataforma).">
                <Input
                  type="text"
                  placeholder="Ex.: Loja Centro"
                  value={form.storeName}
                  onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                />
              </FormField>
              {form.platform === "99FOOD" ? (
                <>
                  <FormField label="APP ID" required>
                    <Input
                      type="text"
                      value={formCred.appId}
                      onChange={(e) => setFormCred({ ...formCred, appId: e.target.value })}
                    />
                  </FormField>
                  <FormField label="APP Shopp ID" required>
                    <Input
                      type="text"
                      value={formCred.appShoppId}
                      onChange={(e) => setFormCred({ ...formCred, appShoppId: e.target.value })}
                    />
                  </FormField>
                </>
              ) : (
                <FormField label="Client ID" required>
                  <Input
                    type="text"
                    value={formCred.clientId}
                    onChange={(e) => setFormCred({ ...formCred, clientId: e.target.value })}
                  />
                </FormField>
              )}
              <FormField label="Client Secret" required>
                <Input
                  type="password"
                  value={formCred.clientSecret}
                  onChange={(e) => setFormCred({ ...formCred, clientSecret: e.target.value })}
                />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="w-4 h-4 accent-ink"
                />
                Conta ativa (recebe webhooks e sincroniza)
              </label>
            </div>
          </Modal>
        )}

        {showEdit && editing && (
          <Modal
            open
            onClose={() => {
              setShowEdit(false)
              setEditing(null)
            }}
            title="Editar Conta"
            size="md"
            footer={
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowEdit(false)
                    setEditing(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleEditSave}>
                  Salvar
                </Button>
              </div>
            }
          >
            <div ref={editRef} className="p-4 space-y-4">
              <p className="text-xs text-muted">
                Conta {PLATFORM_LABEL[editing.platform]} ·{" "}
                {editing.credentials.appShoppId || editing.credentials.clientId || ""}
              </p>
              <FormField label="Nome da Loja">
                <Input
                  type="text"
                  value={editForm.storeName}
                  onChange={(e) => setEditForm({ ...editForm, storeName: e.target.value })}
                />
              </FormField>
              {editing.platform === "99FOOD" ? (
                <>
                  <FormField label="APP ID (novo, opcional)">
                    <Input
                      type="text"
                      value={editCred.appId}
                      onChange={(e) => setEditCred({ ...editCred, appId: e.target.value })}
                    />
                  </FormField>
                  <FormField label="APP Shopp ID (novo, opcional)">
                    <Input
                      type="text"
                      value={editCred.appShoppId}
                      onChange={(e) => setEditCred({ ...editCred, appShoppId: e.target.value })}
                    />
                  </FormField>
                </>
              ) : (
                <FormField label="Client ID (novo, opcional)">
                  <Input
                    type="text"
                    value={editCred.clientId}
                    onChange={(e) => setEditCred({ ...editCred, clientId: e.target.value })}
                  />
                </FormField>
              )}
              <FormField label="Client Secret (novo, opcional)">
                <Input
                  type="password"
                  placeholder="Deixe em branco para manter"
                  value={editCred.clientSecret}
                  onChange={(e) => setEditCred({ ...editCred, clientSecret: e.target.value })}
                />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={editForm.enabled}
                  onChange={(e) => setEditForm({ ...editForm, enabled: e.target.checked })}
                  className="w-4 h-4 accent-ink"
                />
                Conta ativa
              </label>
            </div>
          </Modal>
        )}
      </div>
      {dialog}
    </AppShell>
  )
}
