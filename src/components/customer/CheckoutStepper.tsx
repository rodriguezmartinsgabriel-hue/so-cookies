"use client"

import { Check } from "lucide-react"

type Step = 1 | 2 | 3

const LABELS: Record<Step, string> = {
  1: "Carrinho",
  2: "Entrega",
  3: "Revisar",
}

export function CheckoutStepper({ current, onStep }: { current: Step; onStep: (step: Step) => void }) {
  const steps: Step[] = [1, 2, 3]

  return (
    <div className="flex items-center justify-between px-2 mb-4">
      {steps.map((step, idx) => {
        const done = current > step
        const isCurrent = current === step
        return (
          <div key={step} className="flex items-center">
            <button
              type="button"
              onClick={() => done && onStep(step)}
              className={`flex flex-col items-center gap-1 ${done || isCurrent ? "cursor-pointer" : "cursor-default"}`}
              aria-label={`Passo ${step}: ${LABELS[step]}`}
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  done
                    ? "bg-success text-paper"
                    : isCurrent
                      ? "bg-ink text-paper"
                      : "bg-cream border border-line text-muted"
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : step}
              </span>
              <span className={`text-xs ${isCurrent ? "font-semibold text-ink" : done ? "text-ink" : "text-muted"}`}>
                {LABELS[step]}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                  idx < current - 1 ? "bg-success" : "bg-line"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
