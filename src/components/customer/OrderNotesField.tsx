"use client"

import { useState, useCallback } from "react"
import { MessageSquare } from "lucide-react"

const MAX_NOTE_LENGTH = 200

export function OrderNotesField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const remaining = MAX_NOTE_LENGTH - value.length

  const toggleExpand = useCallback(() => setExpanded((prev) => !prev), [])

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={toggleExpand}
        className="flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-ink/80"
      >
        <MessageSquare className="w-4 h-4" />
        Observações
        <span className="text-muted font-normal text-xs">({remaining} restantes)</span>
      </button>
      {expanded && (
        <>
          <textarea
            rows={2}
            placeholder="Ex: deixar na porta, ligar ao chegar..."
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, MAX_NOTE_LENGTH))}
            className="w-full resize-none rounded-lg border border-line bg-paper/70 px-3 py-2 text-base text-ink placeholder:text-kraft focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 transition-colors backdrop-blur-sm"
            maxLength={MAX_NOTE_LENGTH}
          />
          {remaining < 50 && (
            <p className={`text-xs ${remaining < 20 ? "text-danger" : "text-muted"}`}>
              {remaining} caractere{remaining !== 1 ? "s" : ""} restante{remaining !== 1 ? "s" : ""}
            </p>
          )}
        </>
      )}
    </div>
  )
}
