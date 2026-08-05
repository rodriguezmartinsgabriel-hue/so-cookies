"use client"

import type { CSSProperties } from "react"
import { Check, Clock } from "lucide-react"

export const statusOrder = ["PENDENTE", "CONFIRMADO", "PRODUCAO", "PRONTO", "ENTREGA", "CONCLUIDO"]

export const statusLabel: Record<string, string> = {
  PENDENTE: "Recebido",
  CONFIRMADO: "Confirmado",
  PRODUCAO: "Em produção",
  PRONTO: "Pronto para retirar",
  ENTREGA: "Em entrega",
  CONCLUIDO: "Finalizado",
  CANCELADO: "Cancelado",
}

export function OrderStatusTimeline({ status }: { status: string }) {
  const stepIndex = statusOrder.indexOf(status)
  if (stepIndex < 0) return null
  const finalStep = stepIndex === statusOrder.length - 1

  return (
    <ol className="stagger">
      {statusOrder.map((st, idx) => {
        const current = idx === stepIndex
        const done = idx < stepIndex || (current && finalStep)
        return (
          <li
            key={st}
            style={{ "--stagger": idx } as CSSProperties}
            className="relative flex gap-3 pb-3 last:pb-0"
          >
            {idx < statusOrder.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-3 top-6 bottom-0 w-0.5 rounded-full transition-colors duration-300 ${
                  idx < stepIndex ? "bg-success" : "bg-line"
                }`}
              />
            )}
            <span
              className={`relative z-10 shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300 ${
                done
                  ? "bg-success text-paper"
                  : current
                    ? "bg-ink text-paper"
                    : "bg-cream border border-line text-muted"
              }`}
            >
              {done ? (
                <Check className="w-4 h-4" />
              ) : current ? (
                <Clock className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-line" />
              )}
            </span>
            <p
              className={`text-sm leading-tight pt-1 ${
                current ? "font-semibold text-ink" : done ? "text-ink" : "text-muted"
              }`}
            >
              {statusLabel[st]}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
