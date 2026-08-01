"use client";

import { useState, useEffect, useCallback } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useRole } from "@/hooks/useRole";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  Plus,
  Store,
  X,
  Trash2,
  Edit,
  Copy,
  Check,
  Plug,
  AlertTriangle,
  Eye,
  ChevronDown,
} from "lucide-react";

type Account = {
  id: string;
  platform: "99FOOD" | "IFOOD";
  storeName: string | null;
  enabled: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  createdAt: string;
  webhookUrl?: string;
  credentials: { appId?: string; appShoppId?: string; clientId?: string };
};

const PLATFORM_LABEL: Record<string, string> = { "99FOOD": "99Food", IFOOD: "iFood" };

type CredForm = { appId: string; appShoppId: string; clientId: string; clientSecret: string };

const EMPTY_CRED: CredForm = { appId: "", appShoppId: "", clientId: "", clientSecret: "" };

export default function IntegracoesPage() {
  const { isAdmin } = useRole();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const createRef = useFocusTrap(showCreate);
  const [showEdit, setShowEdit] = useState(false);
  const editRef = useFocusTrap(showEdit);
  const [editing, setEditing] = useState<Account | null>(null);

  const [form, setForm] = useState({ platform: "99FOOD", storeName: "", enabled: true });
  const [formCred, setFormCred] = useState<CredForm>(EMPTY_CRED);
  const [editForm, setEditForm] = useState({ storeName: "", enabled: true });
  const [editCred, setEditCred] = useState<CredForm>(EMPTY_CRED);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/integrations/accounts");
      if (resp.ok) {
        setAccounts(await resp.json());
      } else {
        const data = await resp.json().catch(() => null);
        setError(data?.error || "Erro ao carregar contas");
      }
    } catch {
      setError("Erro ao carregar contas");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) loadAccounts();
    else setLoading(false);
  }, [isAdmin, loadAccounts]);

  function resetForm() {
    setForm({ platform: "99FOOD", storeName: "", enabled: true });
    setFormCred(EMPTY_CRED);
  }

  function openEdit(acc: Account) {
    setEditing(acc);
    setEditForm({ storeName: acc.storeName || "", enabled: acc.enabled });
    setEditCred(EMPTY_CRED);
    setShowEdit(true);
  }

  function buildCredentials(platform: string, cred: CredForm) {
    return platform === "99FOOD"
      ? { appId: cred.appId, appShoppId: cred.appShoppId, clientSecret: cred.clientSecret }
      : { clientId: cred.clientId, clientSecret: cred.clientSecret };
  }

  async function handleCreate() {
    const creds = buildCredentials(form.platform, formCred);
    const payload: any = { platform: form.platform, storeName: form.storeName, credentials: creds, enabled: form.enabled };
    const resp = await fetch("/api/integrations/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => null);
      alert(data?.error || "Erro ao criar conta");
      return;
    }
    setShowCreate(false);
    resetForm();
    await loadAccounts();
  }

  async function handleEditSave() {
    if (!editing) return;
    const payload: any = { storeName: editForm.storeName, enabled: editForm.enabled };
    if (editCred.clientSecret) {
      const creds = buildCredentials(editing.platform, editCred);
      const required = editing.platform === "99FOOD" ? ["appId", "appShoppId", "clientSecret"] : ["clientId", "clientSecret"];
      if (required.some((k) => !(creds as any)[k])) {
        alert("Preencha todos os campos de credenciais para atualizar, ou deixe em branco para manter.");
        return;
      }
      payload.credentials = creds;
    }
    const resp = await fetch(`/api/integrations/accounts/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => null);
      alert(data?.error || "Erro ao atualizar conta");
      return;
    }
    setShowEdit(false);
    setEditing(null);
    await loadAccounts();
  }

  async function handleDelete(acc: Account) {
    if (!confirm(`Excluir a conta ${acc.storeName || acc.platform}?`)) return;
    const resp = await fetch(`/api/integrations/accounts/${acc.id}`, { method: "DELETE" });
    if (!resp.ok) {
      const data = await resp.json().catch(() => null);
      alert(data?.error || "Erro ao excluir conta");
      return;
    }
    await loadAccounts();
  }

  async function handleToggle(acc: Account) {
    const resp = await fetch(`/api/integrations/accounts/${acc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !acc.enabled }),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => null);
      alert(data?.error || "Erro ao atualizar conta");
      return;
    }
    await loadAccounts();
  }

  async function handleCopy(acc: Account) {
    if (!acc.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(acc.webhookUrl);
      setCopiedId(acc.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      alert(acc.webhookUrl);
    }
  }

  const enabledCount = accounts.filter((a) => a.enabled).length;

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="border border-line rounded-lg bg-paper p-8 text-center shadow-card">
          <Eye className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-muted">Apenas administradores podem gerenciar integrações.</p>
        </div>
      </AppShell>
    );
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
          <button
            onClick={() => { resetForm(); setShowCreate(true); }}
            className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Conta
          </button>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 w-full text-left border border-line rounded-lg bg-paper px-4 py-3 text-sm font-medium text-ink hover:bg-cream transition-colors"
        >
          <Plug className="w-4 h-4 text-muted" />
          Como configurar os webhooks
          <ChevronDown className={`w-4 h-4 ml-auto text-muted transition-transform ${showGuide ? "rotate-180" : ""}`} />
        </button>

        {showGuide && (
          <div className="border border-line rounded-lg bg-paper p-4 space-y-3 text-sm text-muted shadow-card">
            <p>
              <strong className="text-ink">99Food (Open Delivery):</strong> no painel da 99Food, cadastre o webhook
              apontando para <code className="text-xs bg-cream px-1.5 py-0.5 rounded">{"/api/integrations/99food/webhook"}</code>.
              Evento <code className="text-xs bg-cream px-1.5 py-0.5 rounded">newEvent</code>; headers{" "}
              <code className="text-xs bg-cream px-1.5 py-0.5 rounded">x-app-id</code>,{" "}
              <code className="text-xs bg-cream px-1.5 py-0.5 rounded">x-app-shopp-id</code> e assinatura{" "}
              <code className="text-xs bg-cream px-1.5 py-0.5 rounded">x-app-signature</code> (HMAC-SHA256 do body com o Client Secret).
            </p>
            <p>
              <strong className="text-ink">iFood:</strong> no Portal iFood, registre o webhook apontando para{" "}
              <code className="text-xs bg-cream px-1.5 py-0.5 rounded">{"/api/integrations/ifood/webhook"}</code>.
              A assinatura <code className="text-xs bg-cream px-1.5 py-0.5 rounded">X-IFood-Signature</code> é validada com o Client Secret da conta.
            </p>
            <p className="text-xs text-muted">
              A resposta ao webhook é 200/202 para reconhecer o evento. Pedidos novos aparecem na aba Delivery com
              SLA de 8 minutos e som de notificação.
            </p>
          </div>
        )}

        {error && <ErrorState message={error} onRetry={loadAccounts} />}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-3 w-64 mb-2" />
                <Skeleton className="h-3 w-72" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => (
              <div key={acc.id} className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-8 h-8 rounded-lg bg-ink/5 flex items-center justify-center shrink-0">
                        <Store className="w-4 h-4 text-ink" strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-semibold text-ink">{acc.storeName || "Loja"}</p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ink/5 text-muted">
                        {PLATFORM_LABEL[acc.platform] || acc.platform}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${acc.enabled ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                        {acc.enabled ? "Ativa" : "Desativada"}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-2">
                      {acc.platform === "99FOOD"
                        ? `App ID: ${acc.credentials.appId || "-"} · Shopp ID: ${acc.credentials.appShoppId || "-"}`
                        : `Client ID: ${acc.credentials.clientId || "-"}`}
                    </p>
                    {acc.webhookUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <code className="text-[11px] bg-cream px-2 py-1 rounded flex-1 truncate">{acc.webhookUrl}</code>
                        <button
                          onClick={() => handleCopy(acc)}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-line text-ink hover:bg-cream transition-colors shrink-0"
                        >
                          {copiedId === acc.id ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                          {copiedId === acc.id ? "Copiado" : "Copiar"}
                        </button>
                      </div>
                    )}
                    <p className="text-[11px] text-muted mt-2">
                      Última sincronização: {acc.lastSyncAt ? new Date(acc.lastSyncAt).toLocaleString("pt-BR") : "nunca"}
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
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-paper shadow transition-all ${acc.enabled ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                    <button onClick={() => openEdit(acc)} aria-label="Editar" className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(acc)} aria-label="Excluir" className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="text-center py-10 text-muted border border-dashed border-line rounded-lg">
                Nenhuma conta integrada ainda. Crie uma conta 99Food ou iFood para começar.
              </div>
            )}
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="nova-conta-title">
            <div ref={createRef} className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 id="nova-conta-title" className="text-lg font-bold text-ink">Nova Conta</h3>
                <button onClick={() => setShowCreate(false)} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Plataforma</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
                  >
                    <option value="99FOOD">99Food</option>
                    <option value="IFOOD">iFood</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome da Loja *</label>
                  <input
                    type="text"
                    placeholder="Ex.: Loja Centro"
                    value={form.storeName}
                    onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                    className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
                  />
                  <p className="text-[11px] text-muted mt-1">Identificador da loja no app (único por plataforma).</p>
                </div>
                {form.platform === "99FOOD" ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">APP ID *</label>
                      <input type="text" value={formCred.appId} onChange={(e) => setFormCred({ ...formCred, appId: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">APP Shopp ID *</label>
                      <input type="text" value={formCred.appShoppId} onChange={(e) => setFormCred({ ...formCred, appShoppId: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Client ID *</label>
                    <input type="text" value={formCred.clientId} onChange={(e) => setFormCred({ ...formCred, clientId: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Client Secret *</label>
                  <input type="password" value={formCred.clientSecret} onChange={(e) => setFormCred({ ...formCred, clientSecret: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="w-4 h-4 accent-ink" />
                  Conta ativa (recebe webhooks e sincroniza)
                </label>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleCreate} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}

        {showEdit && editing && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="edit-conta-title">
            <div ref={editRef} className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 id="edit-conta-title" className="text-lg font-bold text-ink">Editar Conta</h3>
                <button onClick={() => { setShowEdit(false); setEditing(null); }} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-xs text-muted">
                  Conta {PLATFORM_LABEL[editing.platform]} · {editing.credentials.appShoppId || editing.credentials.clientId || ""}
                </p>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome da Loja</label>
                  <input type="text" value={editForm.storeName} onChange={(e) => setEditForm({ ...editForm, storeName: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                {editing.platform === "99FOOD" ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">APP ID (novo, opcional)</label>
                      <input type="text" value={editCred.appId} onChange={(e) => setEditCred({ ...editCred, appId: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">APP Shopp ID (novo, opcional)</label>
                      <input type="text" value={editCred.appShoppId} onChange={(e) => setEditCred({ ...editCred, appShoppId: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Client ID (novo, opcional)</label>
                    <input type="text" value={editCred.clientId} onChange={(e) => setEditCred({ ...editCred, clientId: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Client Secret (novo, opcional)</label>
                  <input type="password" placeholder="Deixe em branco para manter" value={editCred.clientSecret} onChange={(e) => setEditCred({ ...editCred, clientSecret: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={editForm.enabled} onChange={(e) => setEditForm({ ...editForm, enabled: e.target.checked })} className="w-4 h-4 accent-ink" />
                  Conta ativa
                </label>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button onClick={() => { setShowEdit(false); setEditing(null); }} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleEditSave} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
