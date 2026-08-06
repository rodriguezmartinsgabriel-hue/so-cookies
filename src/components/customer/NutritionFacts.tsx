"use client"

import type { ProductNutrition } from "@/lib/recipe-nutrition"

type NutritionFactsProps = {
  nutrition: ProductNutrition | null
  className?: string
}

function fmt(value: number | null, unit: string): string {
  if (value == null) return "—"
  const rounded = Math.round(value * 10) / 10
  return `${rounded}${unit}`
}

export function NutritionFacts({ nutrition, className = "" }: NutritionFactsProps) {
  if (!nutrition) {
    return (
      <p className={`text-xs text-muted ${className}`}>
        Sem informações nutricionais cadastradas.
      </p>
    )
  }

  const macros = [
    { label: "Calorias", value: nutrition.caloriesPerUnit, unit: " cal" },
    { label: "Proteína", value: nutrition.proteinPerUnit, unit: "g" },
    { label: "Carboidratos", value: nutrition.carbsPerUnit, unit: "g" },
    { label: "Gordura", value: nutrition.fatPerUnit, unit: "g" },
  ]

  if (
    nutrition.caloriesPerUnit == null &&
    nutrition.proteinPerUnit == null &&
    nutrition.carbsPerUnit == null &&
    nutrition.fatPerUnit == null
  ) {
    return (
      <p className={`text-xs text-muted ${className}`}>
        Sem informações nutricionais cadastradas.
      </p>
    )
  }

  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
        Informação nutricional
      </p>
      <dl className="grid grid-cols-4 gap-2 bg-cream rounded-md p-3">
        {macros.map((m) => (
          <div key={m.label} className="min-w-0">
            <dd className="text-sm font-semibold text-ink truncate">
              {fmt(m.value, m.unit)}
            </dd>
            <dt className="text-[11px] text-muted">{m.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  )
}
