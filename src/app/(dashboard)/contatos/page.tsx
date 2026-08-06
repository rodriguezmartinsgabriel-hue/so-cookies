"use client"

import { useState, useEffect } from "react"
import { useConfirm } from "@/hooks/useConfirm"
import { useRole } from "@/hooks/useRole"
import { useQueryData } from "@/hooks/useQueryData"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/ErrorState"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Modal } from "@/components/ui/Modal"
import { GlassSurface } from "@/components/ui/GlassSurface"
import { repository } from "@/lib/repository"
import type { Contact } from "@/lib/entity-types"
import type { LocalContactInteraction } from "@/lib/db-local"
import {
  BookUser,
  Plus,
  X,
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
  Eye,
  Smartphone,
} from "lucide-react"

const TYPE_CONFIG: Record<
  string,
  { label: string; variant: "neutral" | "success" | "warning" | "danger" | "info" | "accent" }
> = {
  CLIENTE: { label: "Cliente", variant: "success" },
  FORNECEDOR: { label: "Fornecedor", variant: "info" },
  LEAD: { label: "Lead", variant: "warning" },
  OUTRO: { label: "Outro", variant: "neutral" },
}

const INTERACTION_CONFIG: Record<string, { label: string; icon: typeof StickyNote }> = {
  NOTA: { label: "Nota", icon: StickyNote },
  LIGACAO: { label: "Ligação", icon: PhoneCall },
  EMAIL: { label: "E-mail", icon: Mail },
  WHATSAPP: { label: "WhatsApp", icon: MessageCircle },
  VISITA: { label: "Visita", icon: Calendar },
  OUTRO: { label: "Outro", icon: Send },
}

const FILTERS = [
  { value: "ALL", label: "Todos" },
  { value: "APP", label: "Do app" },
  { value: "CLIENTE", label: "Clientes" },
  { value: "FORNECEDOR", label: "Fornecedores" },
  { value: "LEAD", label: "Leads" },
  { value: "OUTRO", label: "Outros" },
]

const inputClass =
  "w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"

export default function ContatosPage() {
  const { canEdit } = useRole()
  const { confirm, dialog } = useConfirm()
  const { data: contacts, isLoading: loading, error: contactsError, invalidate } = useQueryData("contacts")
  const error = contactsError ? "Erro ao carregar contatos" : null
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("ALL")
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", type: "CLIENTE", company: "", notes: "" })

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [interactions, setInteractions] = useState<LocalContactInteraction[]>([])
  const [interactionForm, setInteractionForm] = useState({ type: "NOTA", note: "" })

  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState("")
  const contactModalRef = useFocusTrap(Boolean(selectedContact))
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState("")

  useEffect(() => {
    if (selectedContact) {
      repository.contacts
        .getInteractions(selectedContact.id)
        .then(setInteractions)
        .catch(() => setInteractions([]))
    }
  }, [selectedContact])

  const filtered = contacts.filter((c) => {
    const matchesFilter = filter === "ALL" || (filter === "APP" ? !!c.customerId : c.type === filter)
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q)
    return matchesFilter && matchesSearch
  })

  const typeCounts = contacts.reduce<Record<string, number>>((acc, c) => {
    const type = c.type
    if (type) acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
  const appCount = contacts.filter((c) => !!c.customerId).length

  function resetForm() {
    setForm({ name: "", email: "", phone: "", type: "CLIENTE", company: "", notes: "" })
  }

  async function handleCreate() {
    if (!form.name.trim()) return
    await repository.contacts.create({
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      type: form.type,
      company: form.company.trim() || undefined,
      notes: form.notes.trim() || undefined,
    })
    setShowModal(false)
    resetForm()
    await invalidate()
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Excluir este contato?"))) return
    await repository.contacts.delete(id)
    await invalidate()
    if (selectedContact?.id === id) setSelectedContact(null)
  }

  function startEdit(id: string, field: string, value: string) {
    setEditingField({ id, field })
    setEditValue(value)
  }

  function cancelEdit() {
    setEditingField(null)
  }

  async function saveEdit(id: string) {
    if (!editingField) return
    const { field } = editingField
    if (field === "name" && !editValue.trim()) {
      cancelEdit()
      return
    }
    const value = editValue.trim()
    const payload = { [field]: value || undefined }
    await repository.contacts.update(id, payload)
    await invalidate()
    if (selectedContact?.id === id) setSelectedContact((prev) => ({ ...(prev ?? selectedContact), ...payload }))
    cancelEdit()
  }

  const isEditing = (id: string, field: string) => editingField?.id === id && editingField.field === field

  function handleEditKey(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key === "Enter") e.currentTarget.blur()
    if (e.key === "Escape") cancelEdit()
  }

  function startEditNotes() {
    setNotesValue(selectedContact?.notes || "")
    setEditingNotes(true)
  }

  async function saveNotes() {
    if (!selectedContact) return
    const notes = notesValue.trim() || undefined
    await repository.contacts.update(selectedContact.id, { notes })
    await invalidate()
    setSelectedContact({ ...selectedContact, notes: notes ?? null })
    setEditingNotes(false)
  }

  async function handleAddInteraction() {
    if (!selectedContact || !interactionForm.note.trim()) return
    const created = await repository.contacts.createInteraction(selectedContact.id, {
      type: interactionForm.type,
      note: interactionForm.note.trim(),
    })
    setInteractionForm({ type: "NOTA", note: "" })
    setInteractions((prev) => [created, ...prev])
  }

  async function handleDeleteInteraction(id: string) {
    if (!(await confirm("Excluir esta interação?"))) return
    await repository.contacts.deleteInteraction(id)
    setInteractions((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Contatos</h1>
            <p className="text-sm text-muted">
              {contacts.length} contatos · {typeCounts.CLIENTE || 0} clientes · {typeCounts.FORNECEDOR || 0}{" "}
              fornecedores
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
              Novo Contato
            </Button>
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
              {f.label} ({f.value === "ALL" ? contacts.length : f.value === "APP" ? appCount : typeCounts[f.value] || 0}
              )
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            type="text"
            placeholder="Buscar por nome, e-mail, telefone ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>

        {error && <ErrorState message={error} onRetry={invalidate} />}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">
            {search || filter !== "ALL"
              ? "Nenhum contato encontrado para esta busca."
              : 'Nenhum contato cadastrado. Clique em "Novo Contato" para começar.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => {
              const cfg = TYPE_CONFIG[c.type] || TYPE_CONFIG.OUTRO
              return (
                <Card key={c.id}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedContact(c)}
                      aria-label="Ver detalhes"
                      className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center shrink-0 hover:bg-kraft/50 transition-colors"
                    >
                      <BookUser className="w-5 h-5 text-muted" strokeWidth={1.5} />
                    </button>
                    <div className="flex-1 min-w-0">
                      {isEditing(c.id, "name") ? (
                        <input
                          autoFocus
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(c.id)}
                          onKeyDown={handleEditKey}
                          className="w-full h-7 px-2 border border-info rounded text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                        />
                      ) : (
                        <p
                          onClick={() => canEdit && startEdit(c.id, "name", c.name)}
                          title={canEdit ? "Clique para editar" : undefined}
                          className={`text-sm font-semibold text-ink truncate px-1 rounded transition-colors ${canEdit ? "cursor-pointer hover:bg-info/10" : ""}`}
                        >
                          {c.name}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted truncate mt-0.5">
                        <Building2 className="w-3 h-3 shrink-0" />
                        {isEditing(c.id, "company") ? (
                          <input
                            autoFocus
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveEdit(c.id)}
                            onKeyDown={handleEditKey}
                            className="w-32 h-6 px-1.5 border border-info rounded text-xs text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                          />
                        ) : (
                          <span
                            onClick={() => canEdit && startEdit(c.id, "company", c.company || "")}
                            title={canEdit ? "Clique para editar" : undefined}
                            className={`px-1 rounded transition-colors ${canEdit ? "cursor-pointer hover:bg-info/10" : ""}`}
                          >
                            {c.company || <em className="text-kraft not-italic">Sem empresa</em>}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {isEditing(c.id, "type") ? (
                        <select
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(c.id)}
                          className="h-7 px-2 border border-info rounded text-xs text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                        >
                          {Object.entries(TYPE_CONFIG).map(([value, tcfg]) => (
                            <option key={value} value={value}>
                              {tcfg.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge
                          variant={cfg.variant}
                          onClick={() => canEdit && startEdit(c.id, "type", c.type)}
                          title={canEdit ? "Clique para editar" : undefined}
                          className={`${canEdit ? "cursor-pointer hover:ring-1 hover:ring-ink" : ""}`}
                        >
                          {cfg.label}
                        </Badge>
                      )}
                      {c.customerId && (
                        <Badge variant="info" title="Cliente cadastrado pelo app">
                          <Smartphone className="w-3 h-3" /> App
                        </Badge>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedContact(c)}
                        aria-label="Ver"
                        className="p-1.5 rounded-md hover:bg-cream text-muted"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          aria-label="Excluir"
                          className="p-1.5 rounded-md hover:bg-cream text-danger"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {isEditing(c.id, "phone") ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(c.id)}
                        onKeyDown={handleEditKey}
                        className="h-6 w-36 px-1.5 border border-info rounded text-xs text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                      />
                    ) : (
                      <span
                        onClick={() => canEdit && startEdit(c.id, "phone", c.phone || "")}
                        title={canEdit ? "Clique para editar" : undefined}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-line text-xs text-ink ${canEdit ? "cursor-pointer hover:bg-info/10 hover:border-info" : ""}`}
                      >
                        <Phone className="w-3 h-3 text-muted" />{" "}
                        {c.phone || <em className="text-kraft not-italic">adicionar</em>}
                      </span>
                    )}
                    {isEditing(c.id, "email") ? (
                      <input
                        autoFocus
                        type="email"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(c.id)}
                        onKeyDown={handleEditKey}
                        className="h-6 w-48 px-1.5 border border-info rounded text-xs text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                      />
                    ) : (
                      <span
                        onClick={() => canEdit && startEdit(c.id, "email", c.email || "")}
                        title={canEdit ? "Clique para editar" : undefined}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-line text-xs text-ink ${canEdit ? "cursor-pointer hover:bg-info/10 hover:border-info" : ""}`}
                      >
                        <Mail className="w-3 h-3 text-muted" />{" "}
                        {c.email || <em className="text-kraft not-italic">adicionar</em>}
                      </span>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {showModal && (
          <Modal
            open
            onClose={() => setShowModal(false)}
            title="Novo Contato"
            size="md"
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleCreate}>
                  Salvar
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
                  placeholder="Ex: Maria Silva"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Tipo</label>
                  <select
                    id="sel-nome-label-input-type-text-placeholder-e"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className={inputClass}
                  >
                    {Object.entries(TYPE_CONFIG).map(([value, cfg]) => (
                      <option key={value} value={value}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Empresa</label>
                  <Input
                    type="text"
                    placeholder="Ex: Padaria Central"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                    Telefone
                  </label>
                  <Input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">E-mail</label>
                  <Input
                    type="email"
                    placeholder="contato@exemplo.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                  Observações
                </label>
                <textarea
                  rows={3}
                  placeholder="Notas sobre este contato..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors resize-none"
                />
              </div>
            </div>
          </Modal>
        )}

        {selectedContact && (
          <div
            className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-detail-title"
          >
            <div ref={contactModalRef} className="w-full max-w-lg max-h-[85vh]">
              <GlassSurface tone="strong" className="rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 bg-paper">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center">
                      <BookUser className="w-5 h-5 text-muted" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 id="contact-detail-title" className="text-lg font-bold text-ink">
                        {selectedContact.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted">
                          {TYPE_CONFIG[selectedContact.type]?.label}
                          {selectedContact.company ? ` · ${selectedContact.company}` : ""}
                        </p>
                        {selectedContact.customerId && (
                          <Badge variant="info" title="Cliente cadastrado pelo app">
                            <Smartphone className="w-3 h-3" /> Do app
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedContact(null)}
                    data-close-modal
                    aria-label="Fechar"
                    className="p-1.5 rounded-md hover:bg-cream text-muted"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedContact.phone && (
                      <span className="flex items-center gap-2 text-ink">
                        <Phone className="w-4 h-4 text-muted" /> {selectedContact.phone}
                      </span>
                    )}
                    {selectedContact.email && (
                      <span className="flex items-center gap-2 text-ink truncate">
                        <Mail className="w-4 h-4 text-muted shrink-0" /> {selectedContact.email}
                      </span>
                    )}
                    {selectedContact.company && (
                      <span className="flex items-center gap-2 text-ink">
                        <Building2 className="w-4 h-4 text-muted" /> {selectedContact.company}
                      </span>
                    )}
                  </div>
                  {editingNotes ? (
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Observações</p>
                      <textarea
                        autoFocus
                        rows={3}
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value)}
                        onBlur={saveNotes}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditingNotes(false)
                        }}
                        className="w-full px-3 py-2 border border-info rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink resize-none"
                      />
                    </div>
                  ) : selectedContact.notes ? (
                    <div onClick={() => canEdit && startEditNotes()}>
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Observações</p>
                      <p
                        className={`text-sm text-ink bg-cream rounded-lg p-3 border border-line ${canEdit ? "cursor-pointer hover:bg-info/10 hover:border-info" : ""}`}
                      >
                        {selectedContact.notes}
                      </p>
                    </div>
                  ) : canEdit ? (
                    <p
                      onClick={startEditNotes}
                      className="text-xs italic text-kraft cursor-pointer hover:text-info px-1 rounded"
                    >
                      + Adicionar observações
                    </p>
                  ) : null}

                  <div className="border-t border-line pt-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                      Histórico de interações
                    </p>

                    {canEdit && (
                      <div className="flex items-center gap-2 mb-3">
                        <select
                          value={interactionForm.type}
                          onChange={(e) => setInteractionForm({ ...interactionForm, type: e.target.value })}
                          className="h-10 px-3 border border-line rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
                        >
                          {Object.entries(INTERACTION_CONFIG).map(([value, cfg]) => (
                            <option key={value} value={value}>
                              {cfg.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Registrar interação..."
                          value={interactionForm.note}
                          onChange={(e) => setInteractionForm({ ...interactionForm, note: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddInteraction()
                          }}
                          className="flex-1 h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
                        />
                        <Button onClick={handleAddInteraction} aria-label="Adicionar" className="shrink-0 px-4">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {interactions.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted border border-dashed border-line rounded-lg">
                        Nenhuma interação registrada
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {interactions.map((it) => {
                          const cfg = INTERACTION_CONFIG[it.type] || INTERACTION_CONFIG.OUTRO
                          const Icon = cfg.icon
                          return (
                            <div key={it.id} className="flex items-start gap-3 border border-line rounded-lg p-3">
                              <div className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4 text-muted" strokeWidth={1.5} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-ink">{cfg.label}</span>
                                  <span className="text-[10px] text-muted">
                                    {it.createdAt
                                      ? new Date(it.createdAt).toLocaleString("pt-BR", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : ""}
                                  </span>
                                </div>
                                <p className="text-sm text-ink mt-0.5 whitespace-pre-wrap">{it.note}</p>
                              </div>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteInteraction(it.id)}
                                  aria-label="Excluir"
                                  className="p-1.5 rounded-md hover:bg-cream text-danger shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 border-t border-line flex gap-2 sticky bottom-0 bg-paper">
                  <Button className="flex-1" onClick={() => setSelectedContact(null)}>
                    Fechar
                  </Button>
                </div>
              </GlassSurface>
            </div>
          </div>
        )}
      </div>
      {dialog}
    </AppShell>
  )
}
