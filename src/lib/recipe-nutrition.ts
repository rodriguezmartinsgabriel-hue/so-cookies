type IngredientInfo = {
  id?: string
  name: string
  brand: string | null
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
  allergens: string[]
  tags: string[]
}

type RecipeIngredientItem = {
  qty: number
  unit: string
  ingredient: IngredientInfo
}

type RecipeInfo = {
  yield: number
  yieldUnit: string
  ingredients: RecipeIngredientItem[]
}

export type ProductNutrition = {
  caloriesPerUnit: number | null
  proteinPerUnit: number | null
  carbsPerUnit: number | null
  fatPerUnit: number | null
  ingredients: { name: string; brand: string | null }[]
  allergens: string[]
  tags: string[]
}

function qtyToGrams(qty: number, unit: string): number {
  const u = unit.toLowerCase()
  if (u.includes("kg")) return qty * 1000
  return qty // assume gramas por padrão
}

function sumMacros(
  recipes: RecipeInfo[] | undefined,
  macroKey: "caloriesPer100g" | "proteinPer100g" | "carbsPer100g" | "fatPer100g",
): number | null {
  if (!recipes || recipes.length === 0) return null
  let total = 0
  let hasData = false
  for (const recipe of recipes) {
    if (!recipe.yield || recipe.yield <= 0) continue
    for (const item of recipe.ingredients) {
      const grams = qtyToGrams(item.qty, item.unit)
      const valuePer100g = item.ingredient?.[macroKey] ?? null
      if (valuePer100g != null) {
        total += (grams / 100) * valuePer100g
        hasData = true
      }
    }
  }
  if (!hasData) return null
  // Divide pelo yield total. Se há múltiplas receitas, somamos os totais.
  const totalYield = recipes.reduce(
    (sum, r) => sum + (r.yield > 0 ? r.yield : 0),
    0,
  )
  if (totalYield <= 0) return null
  return total / totalYield
}

export function computeProductNutrition(
  recipes: RecipeInfo[] | undefined,
): ProductNutrition | null {
  if (!recipes || recipes.length === 0) return null

  const totalYield = recipes.reduce(
    (sum, r) => sum + (r.yield > 0 ? r.yield : 0),
    0,
  )
  if (totalYield <= 0) return null

  // Agregar ingredientes (nomes únicos, ordenados)
  const ingredientNames = new Set<string>()
  const ingredientBrands = new Map<string, string | null>()
  const allAllergens = new Set<string>()
  const allTagsPerIngredient = new Map<string, string[]>()

  for (const recipe of recipes) {
    for (const item of recipe.ingredients) {
      const ing = item.ingredient
      ingredientNames.add(ing.name)
      ingredientBrands.set(ing.name, ing.brand)
      for (const a of ing.allergens || []) allAllergens.add(a)
      // Interseção de tags: se um ingrediente já tem tags, só mantém as que já existem
      const existing = allTagsPerIngredient.get(ing.name) || ing.tags || []
      allTagsPerIngredient.set(ing.name, existing)
    }
  }

  // Tags = interseção entre todos os ingredientes (se todos têm a tag, mantém)
  const tagSets = Array.from(allTagsPerIngredient.values()).map(
    (t) => new Set(t),
  )
  const tags: string[] = []
  if (tagSets.length > 0) {
    const first = tagSets[0]
    for (const tag of first) {
      if (tagSets.every((set) => set.has(tag))) tags.push(tag)
    }
  }

  const calories = sumMacros(recipes, "caloriesPer100g")
  const protein = sumMacros(recipes, "proteinPer100g")
  const carbs = sumMacros(recipes, "carbsPer100g")
  const fat = sumMacros(recipes, "fatPer100g")

  if (calories == null && protein == null && carbs == null && fat == null) {
    return null
  }

  const ingredients = Array.from(ingredientNames)
    .sort()
    .map((name) => ({
      name,
      brand: ingredientBrands.get(name) ?? null,
    }))

  return {
    caloriesPerUnit: calories,
    proteinPerUnit: protein,
    carbsPerUnit: carbs,
    fatPerUnit: fat,
    ingredients,
    allergens: Array.from(allAllergens).sort(),
    tags,
  }
}
