"use client";

import { useState } from "react";
import { useConfirm } from "@/hooks/useConfirm";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useRole } from "@/hooks/useRole";
import { useQueryData } from "@/hooks/useQueryData";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Plus, X, Edit, Trash2, FileText, Search, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { repository } from "@/lib/repository";
import type { Document } from "@/lib/entity-types";

const CATEGORIES = [
  { value: "FICHA_TECNICA", label: "Fichas Técnicas", color: "bg-ink" },
  { value: "MODO_PREPARO", label: "Modos de Preparo", color: "bg-info" },
  { value: "HIGIENE", label: "Higiene", color: "bg-success" },
  { value: "MANIPULACAO", label: "Manipulação", color: "bg-warning" },
  { value: "TREINAMENTO", label: "Treinamento", color: "bg-purple-500" },
  { value: "OUTROS", label: "Outros", color: "bg-muted" },
] as const;

const CATEGORY_MAP: Record<string, typeof CATEGORIES[number]> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c])
);

export default function DocumentosPage() {
  const { canEdit } = useRole();
  const { confirm, dialog } = useConfirm();
  const { data: documents, isLoading: loading, error: documentsError, invalidate } = useQueryData("documents");
  const error = documentsError ? "Erro ao carregar documentos" : null;
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const modalRef = useFocusTrap(showModal);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const viewRef = useFocusTrap(!!viewingDoc);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "FICHA_TECNICA",
    content: "",
    tags: "",
  });

  function resetForm() {
    setForm({ title: "", description: "", category: "FICHA_TECNICA", content: "", tags: "" });
    setEditingDoc(null);
  }

  function openNew() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(doc: Document) {
    setEditingDoc(doc);
    setForm({
      title: doc.title || "",
      description: doc.description || "",
      category: doc.category || "FICHA_TECNICA",
      content: doc.content || "",
      tags: doc.tags || "",
    });
    setShowModal(true);
  }

  function openView(doc: Document) {
    setViewingDoc(doc);
  }

  async function handleSave() {
    if (!form.title) return;
    const payload = { ...form };

    if (editingDoc) {
      await repository.documents.update(editingDoc.id, payload);
    } else {
      await repository.documents.create(payload);
    }
    setShowModal(false);
    resetForm();
    await invalidate();
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Excluir este documento?"))) return;
    await repository.documents.delete(id);
    await invalidate();
  }

  const filtered = documents.filter((doc) => {
    if (filter !== "ALL" && doc.category !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      doc.title?.toLowerCase().includes(q) ||
      doc.description?.toLowerCase().includes(q) ||
      doc.tags?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: documents.length,
    byCategory: CATEGORIES.map((c) => ({
      ...c,
      count: documents.filter((d) => d.category === c.value).length,
    })),
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Documentos</h1>
            <p className="text-sm text-muted">
              Fichas técnicas, higiene, treinamentos · {stats.total} documentos
            </p>
          </div>
          {canEdit && (
            <button
              onClick={openNew}
              className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Documento
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter("ALL")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === "ALL" ? "bg-ink text-paper" : "bg-cream text-muted hover:bg-kraft/50"
            }`}
          >
            Todos ({stats.total})
          </button>
          {stats.byCategory.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === cat.value ? "bg-ink text-paper" : "bg-cream text-muted hover:bg-kraft/50"
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
          />
        </div>

        {error && (
          <ErrorState message={error} onRetry={invalidate} />
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-line rounded-lg bg-paper shadow-card overflow-hidden p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((doc) => {
              const cat = CATEGORY_MAP[doc.category] || CATEGORIES[5];
              return (
                <div key={doc.id} className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
                  <div className="flex items-center gap-2 p-4">
                    <button
                      onClick={() => setExpanded(expanded === doc.id ? null : doc.id)}
                      className="flex-1 text-left flex items-center justify-between hover:bg-cream/50 transition-colors -m-1 p-1 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${cat.color} text-paper flex items-center justify-center shrink-0`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">{doc.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cream text-muted">
                              {cat.label}
                            </span>
                            {doc.tags && (
                              <span className="text-[10px] text-muted">
                                {doc.tags.split(",").slice(0, 3).join(" · ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {expanded === doc.id ? (
                        <ChevronUp className="w-5 h-5 text-muted shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted shrink-0" />
                      )}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openView(doc)} aria-label="Visualizar" className="p-2 rounded-md hover:bg-cream text-muted transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <>
                          <button onClick={() => openEdit(doc)} aria-label="Editar" className="p-2 rounded-md hover:bg-cream text-muted transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(doc.id)} aria-label="Excluir" className="p-2 rounded-md hover:bg-cream text-danger transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {expanded === doc.id && (
                    <div className="border-t border-line p-4 space-y-3 bg-cream/30">
                      {doc.description && (
                        <div>
                          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Descrição</p>
                          <p className="text-sm text-ink">{doc.description}</p>
                        </div>
                      )}
                      {doc.content && (
                        <div>
                          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Conteúdo</p>
                          <div className="text-sm text-ink whitespace-pre-wrap bg-paper rounded-lg p-3 border border-line max-h-64 overflow-y-auto">
                            {doc.content}
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-muted">
                        Criado em {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">
                {search ? "Nenhum documento encontrado para esta busca." : "Nenhum documento cadastrado. Clique em \"Novo Documento\" para começar."}
              </div>
            )}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="documento-title">
            <div ref={modalRef} className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 bg-paper z-10">
                <h3 id="documento-title" className="text-lg font-bold text-ink">{editingDoc ? "Editar Documento" : "Novo Documento"}</h3>
                <button onClick={() => { setShowModal(false); resetForm(); }} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Título *</label>
                  <input type="text" placeholder="Ex: Higiene das mãos" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Categoria *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors bg-paper">
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Descrição</label>
                  <input type="text" placeholder="Resumo do documento" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Conteúdo</label>
                  <textarea placeholder="Conteúdo do documento (fichas técnicas, procedimentos, etc.)" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} className="w-full px-3 py-2 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Tags</label>
                  <input type="text" placeholder="Separar por vírgulas: cookie, higiene, EPI" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2 sticky bottom-0 bg-paper">
                <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
                  {editingDoc ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {viewingDoc && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="view-documento-title">
            <div ref={viewRef} className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 bg-paper z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${(CATEGORY_MAP[viewingDoc.category] || CATEGORIES[5]).color} text-paper flex items-center justify-center`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 id="view-documento-title" className="text-lg font-bold text-ink">{viewingDoc.title}</h3>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cream text-muted">
                      {(CATEGORY_MAP[viewingDoc.category] || CATEGORIES[5]).label}
                    </span>
                  </div>
                </div>
                <button onClick={() => setViewingDoc(null)} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                {viewingDoc.description && (
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Descrição</p>
                    <p className="text-sm text-ink">{viewingDoc.description}</p>
                  </div>
                )}
                {viewingDoc.content && (
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Conteúdo</p>
                    <div className="text-sm text-ink whitespace-pre-wrap bg-cream/30 rounded-lg p-4 border border-line">
                      {viewingDoc.content}
                    </div>
                  </div>
                )}
                {viewingDoc.tags && (
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {viewingDoc.tags.split(",").map((tag: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-cream text-muted">{tag.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-xs text-muted border-t border-line pt-3">
                  Criado em {new Date(viewingDoc.createdAt).toLocaleDateString("pt-BR")} às {new Date(viewingDoc.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2 sticky bottom-0 bg-paper">
                {canEdit && (
                  <button onClick={() => { setViewingDoc(null); openEdit(viewingDoc); }} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors flex items-center justify-center gap-2">
                    <Edit className="w-4 h-4" /> Editar
                  </button>
                )}
                <button onClick={() => setViewingDoc(null)} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
        {dialog}
    </AppShell>
  );
}
