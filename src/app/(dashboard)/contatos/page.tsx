"use client";

import { useState, useEffect, useCallback } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useRole } from "@/hooks/useRole";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { repository } from "@/lib/repository";
import {
  BookUser,
  Plus,
  X,
  Edit,
  Trash2,
  Search,
  Phone,
  Mail,
  Building2,
  StickyNote,
  MessageCircle,
  PhoneCall,
  Calendar,
  Send,
  Check,
  Eye,
} from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  CLIENTE: { label: "Cliente", className: "bg-success/10 text-success" },
  FORNECEDOR: { label: "Fornecedor", className: "bg-info/10 text-info" },
  LEAD: { label: "Lead", className: "bg-warning/10 text-warning" },
  OUTRO: { label: "Outro", className: "bg-muted/10 text-muted" },
};

const INTERACTION_CONFIG: Record<string, { label: string; icon: any }> = {
  NOTA: { label: "Nota", icon: StickyNote },
  LIGACAO: { label: "Ligação", icon: PhoneCall },
  EMAIL: { label: "E-mail", icon: Mail },
  WHATSAPP: { label: "WhatsApp", icon: MessageCircle },
  VISITA: { label: "Visita", icon: Calendar },
  OUTRO: { label: "Outro", icon: Send },
};

const FILTERS = [
  { value: "ALL", label: "Todos" },
  { value: "CLIENTE", label: "Clientes" },
  { value: "FORNECEDOR", label: "Fornecedores" },
  { value: "LEAD", label: "Leads" },
  { value: "OUTRO", label: "Outros" },
];

export default function ContatosPage() {
  const { canEdit } = useRole();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const modalRef = useFocusTrap(showModal);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", type: "CLIENTE", company: "", notes: "" });

  const [selectedContact, setSelectedContact] = useState<any>(null);
  const detailRef = useFocusTrap(!!selectedContact);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [interactionForm, setInteractionForm] = useState({ type: "NOTA", note: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await repository.contacts.getAll();
      setContacts(data);
    } catch {
      setError("Erro ao carregar contatos");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (selectedContact) {
      repository.contacts.getInteractions(selectedContact.id).then(setInteractions).catch(() => setInteractions([]));
    }
  }, [selectedContact]);

  const filtered = contacts.filter((c: any) => {
    const matchesFilter = filter === "ALL" || c.type === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const typeCounts = contacts.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {});

  function resetForm() {
    setForm({ name: "", email: "", phone: "", type: "CLIENTE", company: "", notes: "" });
    setEditingItem(null);
  }

  function openEdit(item: any) {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      email: item.email || "",
      phone: item.phone || "",
      type: item.type || "CLIENTE",
      company: item.company || "",
      notes: item.notes || "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      type: form.type,
      company: form.company.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editingItem) {
      await repository.contacts.update(editingItem.id, payload);
    } else {
      await repository.contacts.create(payload);
    }
    setShowModal(false);
    resetForm();
    await loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este contato?")) return;
    await repository.contacts.delete(id);
    await loadData();
  }

  async function handleAddInteraction() {
    if (!selectedContact || !interactionForm.note.trim()) return;
    await repository.contacts.createInteraction(selectedContact.id, {
      type: interactionForm.type,
      note: interactionForm.note.trim(),
    });
    setInteractionForm({ type: "NOTA", note: "" });
    const data = await repository.contacts.getInteractions(selectedContact.id);
    setInteractions(data);
  }

  async function handleDeleteInteraction(id: string) {
    if (!confirm("Excluir esta interação?")) return;
    await repository.contacts.deleteInteraction(id);
    const data = await repository.contacts.getInteractions(selectedContact.id);
    setInteractions(data);
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Contatos</h1>
            <p className="text-sm text-muted">
              {contacts.length} contatos · {typeCounts.CLIENTE || 0} clientes · {typeCounts.FORNECEDOR || 0} fornecedores
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Contato
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f.value ? "bg-ink text-paper" : "bg-cream text-muted hover:bg-kraft/50"
              }`}
            >
              {f.label} ({f.value === "ALL" ? contacts.length : typeCounts[f.value] || 0})
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, telefone ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
          />
        </div>

        {error && <ErrorState message={error} onRetry={loadData} />}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">
            {search || filter !== "ALL"
              ? "Nenhum contato encontrado para esta busca."
              : "Nenhum contato cadastrado. Clique em \"Novo Contato\" para começar."}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c: any) => {
              const cfg = TYPE_CONFIG[c.type] || TYPE_CONFIG.OUTRO;
              return (
                <div key={c.id} className="border border-line rounded-lg bg-paper p-4 shadow-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center shrink-0">
                      <BookUser className="w-5 h-5 text-muted" strokeWidth={1.5} />
                    </div>
                    <button onClick={() => setSelectedContact(c)} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-ink truncate">{c.name}</p>
                      <p className="text-xs text-muted truncate">
                        {c.company ? `${c.company} · ` : ""}
                        {c.phone || c.email || "Sem contato"}
                      </p>
                    </button>
                    <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${cfg.className}`}>
                      {cfg.label}
                    </span>
                    <div className="shrink-0 flex items-center gap-1">
                      <button onClick={() => setSelectedContact(c)} aria-label="Ver" className="p-1.5 rounded-md hover:bg-cream text-muted">
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <>
                          <button onClick={() => openEdit(c)} aria-label="Editar" className="p-1.5 rounded-md hover:bg-cream text-muted">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(c.id)} aria-label="Excluir" className="p-1.5 rounded-md hover:bg-cream text-danger">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="contact-title">
            <div ref={modalRef} className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 bg-paper">
                <h3 id="contact-title" className="text-lg font-bold text-ink">{editingItem ? "Editar Contato" : "Novo Contato"}</h3>
                <button onClick={() => { setShowModal(false); resetForm(); }} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome *</label>
                  <input type="text" placeholder="Ex: Maria Silva" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Tipo</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors">
                      {Object.entries(TYPE_CONFIG).map(([value, cfg]) => (
                        <option key={value} value={value}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Empresa</label>
                    <input type="text" placeholder="Ex: Padaria Central" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Telefone</label>
                    <input type="text" placeholder="(11) 99999-9999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">E-mail</label>
                    <input type="email" placeholder="contato@exemplo.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Observações</label>
                  <textarea rows={3} placeholder="Notas sobre este contato..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors resize-none" />
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2 sticky bottom-0 bg-paper">
                <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}

        {selectedContact && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="contact-detail-title">
            <div ref={detailRef} className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 bg-paper">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center">
                    <BookUser className="w-5 h-5 text-muted" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 id="contact-detail-title" className="text-lg font-bold text-ink">{selectedContact.name}</h3>
                    <p className="text-xs text-muted">{TYPE_CONFIG[selectedContact.type]?.label}{selectedContact.company ? ` · ${selectedContact.company}` : ""}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedContact(null)} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedContact.phone && (
                    <span className="flex items-center gap-2 text-ink"><Phone className="w-4 h-4 text-muted" /> {selectedContact.phone}</span>
                  )}
                  {selectedContact.email && (
                    <span className="flex items-center gap-2 text-ink truncate"><Mail className="w-4 h-4 text-muted shrink-0" /> {selectedContact.email}</span>
                  )}
                  {selectedContact.company && (
                    <span className="flex items-center gap-2 text-ink"><Building2 className="w-4 h-4 text-muted" /> {selectedContact.company}</span>
                  )}
                </div>
                {selectedContact.notes && (
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Observações</p>
                    <p className="text-sm text-ink bg-cream rounded-lg p-3 border border-line">{selectedContact.notes}</p>
                  </div>
                )}

                <div className="border-t border-line pt-4">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Histórico de interações</p>

                  {canEdit && (
                    <div className="flex items-center gap-2 mb-3">
                      <select value={interactionForm.type} onChange={(e) => setInteractionForm({ ...interactionForm, type: e.target.value })} className="h-10 px-3 border border-line rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors">
                        {Object.entries(INTERACTION_CONFIG).map(([value, cfg]) => (
                          <option key={value} value={value}>{cfg.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Registrar interação..."
                        value={interactionForm.note}
                        onChange={(e) => setInteractionForm({ ...interactionForm, note: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddInteraction(); }}
                        className="flex-1 h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
                      />
                      <button onClick={handleAddInteraction} aria-label="Adicionar" className="h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors shrink-0">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {interactions.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted border border-dashed border-line rounded-lg">
                      Nenhuma interação registrada
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {interactions.map((it: any) => {
                        const cfg = INTERACTION_CONFIG[it.type] || INTERACTION_CONFIG.OUTRO;
                        const Icon = cfg.icon;
                        return (
                          <div key={it.id} className="flex items-start gap-3 border border-line rounded-lg p-3">
                            <div className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-muted" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-ink">{cfg.label}</span>
                                <span className="text-[10px] text-muted">
                                  {it.createdAt ? new Date(it.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                                </span>
                              </div>
                              <p className="text-sm text-ink mt-0.5 whitespace-pre-wrap">{it.note}</p>
                            </div>
                            {canEdit && (
                              <button onClick={() => handleDeleteInteraction(it.id)} aria-label="Excluir" className="p-1.5 rounded-md hover:bg-cream text-danger shrink-0">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2 sticky bottom-0 bg-paper">
                {canEdit && (
                  <button onClick={() => { setSelectedContact(null); openEdit(selectedContact); }} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors flex items-center justify-center gap-2">
                    <Edit className="w-4 h-4" /> Editar
                  </button>
                )}
                <button onClick={() => setSelectedContact(null)} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
