"use client";

import { useState, useEffect, useCallback } from "react";
import { useConfirm } from "@/hooks/useConfirm";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useRole } from "@/hooks/useRole";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Plus, User, X, Trash2, Edit, Shield, ShieldCheck, Eye } from "lucide-react";
import type { User as UserEntity } from "@/lib/entity-types";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  OPERACIONAL: "Operacional",
  VISUALIZADOR: "Visualizador",
};

const ROLE_ICONS: Record<string, typeof ShieldCheck> = {
  ADMIN: ShieldCheck,
  OPERACIONAL: Shield,
  VISUALIZADOR: Eye,
};

function roleBadge(role: string) {
  const colors: Record<string, string> = {
    ADMIN: "bg-ink text-paper",
    OPERACIONAL: "bg-info/10 text-info",
    VISUALIZADOR: "bg-muted/10 text-muted",
  };
  const Icon = ROLE_ICONS[role] || User;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${colors[role] || "bg-cream text-muted"}`}>
      <Icon className="w-3 h-3" strokeWidth={2} />
      {ROLE_LABELS[role] || role}
    </span>
  );
}

async function fetchUsersData(): Promise<{ users?: UserEntity[]; error?: string }> {
  try {
    const resp = await fetch("/api/users");
    if (resp.ok) return { users: (await resp.json()) as UserEntity[] };
    const data = (await resp.json().catch(() => null)) as { error?: string } | null;
    return { error: data?.error || "Erro ao carregar usuários" };
  } catch {
    return { error: "Erro ao carregar usuários" };
  }
}

export default function UsuariosPage() {
  const { isAdmin } = useRole();
  const { confirm, dialog } = useConfirm();
  const [users, setUsers] = useState<UserEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const createRef = useFocusTrap(showCreate);
  const [showEdit, setShowEdit] = useState(false);
  const editRef = useFocusTrap(showEdit);
  const [editingUser, setEditingUser] = useState<UserEntity | null>(null);

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "OPERACIONAL" });
  const [editForm, setEditForm] = useState({ name: "", role: "OPERACIONAL", password: "" });

  const loadUsers = useCallback(async () => {
    const result = await fetchUsersData();
    if (result.users) setUsers(result.users);
    else setError(result.error || "Erro ao carregar usuários");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let ignore = false;
    async function startFetching() {
      const result = await fetchUsersData();
      if (ignore) return;
      if (result.users) setUsers(result.users);
      else setError(result.error || "Erro ao carregar usuários");
      setLoading(false);
    }
    startFetching();
    return () => { ignore = true };
  }, [isAdmin]);

  function resetForm() {
    setForm({ name: "", email: "", password: "", role: "OPERACIONAL" });
  }

  function openEdit(user: UserEntity) {
    setEditingUser(user);
    setEditForm({ name: user.name || "", role: user.role || "OPERACIONAL", password: "" });
    setShowEdit(true);
  }

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) return;
    const resp = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => null);
      alert(data?.error || "Erro ao criar usuário");
      return;
    }
    setShowCreate(false);
    resetForm();
    await loadUsers();
  }

  async function handleEditSave() {
    if (!editingUser || !editForm.name) return;
    const payload: { name: string; role: string; password?: string } = { name: editForm.name, role: editForm.role };
    if (editForm.password) payload.password = editForm.password;
    const resp = await fetch(`/api/users/${editingUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => null);
      alert(data?.error || "Erro ao atualizar usuário");
      return;
    }
    setShowEdit(false);
    setEditingUser(null);
    await loadUsers();
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Excluir este usuário?"))) return;
    const resp = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!resp.ok) {
      const data = await resp.json().catch(() => null);
      alert(data?.error || "Erro ao excluir usuário");
      return;
    }
    await loadUsers();
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="border border-line rounded-lg bg-paper p-8 text-center shadow-card">
          <Eye className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-muted">Apenas administradores podem gerenciar usuários.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Usuários</h1>
            <p className="text-sm text-muted">
              {users.length} usuário(s) · gerencie acesso e permissões
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowCreate(true); }}
            className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Usuário
          </button>
        </div>

        {error && (
          <ErrorState message={error} onRetry={loadUsers} />
        )}

        {loading && isAdmin ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-line rounded-lg bg-paper p-3 shadow-card">
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-3 w-56" />
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-line rounded-lg bg-paper shadow-card divide-y divide-line">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-full bg-ink flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-paper" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-ink">{u.name}</p>
                    {roleBadge(u.role)}
                  </div>
                  <p className="text-xs text-muted truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(u)} aria-label="Editar" className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(u.id)} aria-label="Excluir" className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-center text-sm text-muted py-8">Nenhum usuário cadastrado</p>
            )}
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="usuario-title">
            <div ref={createRef} className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 id="usuario-title" className="text-lg font-bold text-ink">Novo Usuário</h3>
                <button onClick={() => setShowCreate(false)} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome *</label>
                  <input type="text" placeholder="Nome do usuário" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">E-mail *</label>
                  <input type="email" placeholder="usuario@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Senha *</label>
                  <input type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Perfil</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors">
                    <option value="OPERACIONAL">Operacional</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="VISUALIZADOR">Visualizador</option>
                  </select>
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleCreate} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}

        {showEdit && editingUser && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="edit-usuario-title">
            <div ref={editRef} className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 id="edit-usuario-title" className="text-lg font-bold text-ink">Editar Usuário</h3>
                <button onClick={() => { setShowEdit(false); setEditingUser(null); }} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Perfil</label>
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors">
                    <option value="OPERACIONAL">Operacional</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="VISUALIZADOR">Visualizador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nova senha (opcional)</label>
                  <input type="password" placeholder="Deixe em branco para manter" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button onClick={() => { setShowEdit(false); setEditingUser(null); }} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleEditSave} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
        {dialog}
    </AppShell>
  );
}
