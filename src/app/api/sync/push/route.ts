import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { applyOrderUpdate } from "@/lib/db"
import {
  createOrderSchema,
  updateOrderSchema,
  createSaleSchema,
  createCashFlowSchema,
  updateCashFlowSchema,
  createProductionSchema,
  updateProductionSchema,
  createIngredientSchema,
  updateIngredientSchema,
  createRecipeSchema,
  updateRecipeSchema,
  createDocumentSchema,
  updateDocumentSchema,
  createChannelSchema,
  updateChannelSchema,
  createPriceTierSchema,
  updatePriceTierSchema,
  createDeliveryCostSchema,
  updateDeliveryCostSchema,
} from "@/lib/validation"

const ROLE_HIERARCHY: Record<string, number> = { ADMIN: 3, OPERACIONAL: 2, VISUALIZADOR: 1 }
const ADMIN_ONLY_ENTITIES = ["ingredient", "recipe", "channel", "cashFlow"]

function minRoleFor(entity: string, action: string): "ADMIN" | "OPERACIONAL" {
  if (ADMIN_ONLY_ENTITIES.includes(entity)) return "ADMIN"
  if (entity === "priceTier" && action === "create") return "ADMIN"
  if (entity === "production" && action === "delete") return "ADMIN"
  return "OPERACIONAL"
}

const idSchema = z.object({ id: z.string().min(1) })
const saleItemSchema = z.array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1), price: z.number().min(0) }))
const ingredientItemSchema = z.array(z.object({ ingredientId: z.string().min(1), qty: z.number().min(0), unit: z.string() }))

const syncSchemas: Record<string, z.ZodTypeAny> = {
  "order:create": createOrderSchema,
  "order:update": updateOrderSchema.extend({ id: z.string().min(1) }),
  "order:delete": idSchema,
  "sale:create": createSaleSchema,
  "sale:update": z.object({ id: z.string().min(1), channelId: z.string().optional(), total: z.number().min(0).optional(), userId: z.string().optional(), date: z.string().optional(), items: saleItemSchema.optional() }),
  "sale:delete": idSchema,
  "cashFlow:create": createCashFlowSchema,
  "cashFlow:update": updateCashFlowSchema.extend({ id: z.string().min(1) }),
  "cashFlow:delete": idSchema,
  "production:create": createProductionSchema,
  "production:update": updateProductionSchema.extend({ id: z.string().min(1) }),
  "production:delete": idSchema,
  "ingredient:create": createIngredientSchema,
  "ingredient:update": updateIngredientSchema.extend({ id: z.string().min(1) }),
  "ingredient:delete": idSchema,
  "recipe:create": createRecipeSchema,
  "recipe:update": updateRecipeSchema.extend({ id: z.string().min(1) }),
  "recipe:delete": idSchema,
  "document:create": createDocumentSchema,
  "document:update": updateDocumentSchema.extend({ id: z.string().min(1) }),
  "document:delete": idSchema,
  "channel:create": createChannelSchema,
  "channel:update": updateChannelSchema.extend({ id: z.string().min(1) }),
  "channel:delete": idSchema,
  "priceTier:create": createPriceTierSchema,
  "priceTier:update": updatePriceTierSchema.extend({ id: z.string().min(1) }),
  "priceTier:delete": idSchema,
  "deliveryCost:create": createDeliveryCostSchema,
  "deliveryCost:update": updateDeliveryCostSchema.extend({ id: z.string().min(1) }),
  "deliveryCost:delete": idSchema,
}

export async function POST(request: Request) {
  const { error, session } = await requireAuth("OPERACIONAL")
  if (error) return error

  let changes: unknown
  try {
    const body = await request.json()
    changes = body?.changes
  } catch {
    return NextResponse.json({ ok: true, mappings: {} })
  }
  if (!Array.isArray(changes) || changes.length === 0) {
    return NextResponse.json({ ok: true, mappings: {} })
  }

  const userLevel = ROLE_HIERARCHY[(session?.user?.role as string) || ""] || 0
  const mappings: Record<string, string> = {}
  const errors: { entity: string; action: string; message: string }[] = []

  for (const change of changes) {
    const entity = change?.entity as string
    const action = change?.action as string
    const key = `${entity}:${action}`

    if (!key || !syncSchemas[key]) {
      errors.push({ entity, action, message: "Tipo de alteração não suportado" })
      continue
    }

    const requiredRole = minRoleFor(entity, action)
    if (userLevel < ROLE_HIERARCHY[requiredRole]) {
      errors.push({ entity, action, message: "Sem permissão" })
      continue
    }

    let data: any
    try {
      data = syncSchemas[key].parse(change.data)
    } catch (e: any) {
      errors.push({ entity, action, message: e?.issues?.[0]?.message || "Dados inválidos" })
      continue
    }

    try {
      switch (key) {
        case "order:create": {
          const { items, ...orderData } = data
          const created = await prisma.order.create({
            data: {
              channel: orderData.channel,
              customer: orderData.customer,
              total: orderData.total,
              status: orderData.status || "PENDENTE",
              notes: orderData.notes,
              items: items ? { create: items.map((i: { productId: string; qty: number; price: number }) => ({ productId: i.productId, qty: i.qty, price: i.price })) } : undefined,
            },
          })
          if (change.tempId) mappings[change.tempId] = created.id
          break
        }
        case "order:update": {
          const { id, ...updateData } = data
          const updated = await applyOrderUpdate(id, updateData)
          if (change.tempId) mappings[change.tempId] = updated.id
          break
        }
        case "order:delete": {
          await prisma.order.delete({ where: { id: data.id } })
          break
        }
        case "sale:create": {
          const { items, ...saleData } = data
          const created = await prisma.sale.create({
            data: {
              channelId: saleData.channelId,
              total: saleData.total,
              userId: saleData.userId,
              items: items ? { create: items.map((i: { productId: string; qty: number; price: number }) => ({ productId: i.productId, qty: i.qty, price: i.price })) } : undefined,
            },
          })
          if (change.tempId) mappings[change.tempId] = created.id
          break
        }
        case "sale:update": {
          const { id, items, ...saleData } = data
          const updated = await prisma.sale.update({
            where: { id },
            data: { ...saleData, ...(saleData.date ? { createdAt: new Date(saleData.date) } : {}) },
          })
          if (items) {
            await prisma.saleItem.deleteMany({ where: { saleId: id } })
            await prisma.saleItem.createMany({ data: items.map((i: { productId: string; qty: number; price: number }) => ({ saleId: id, ...i })) })
          }
          if (change.tempId) mappings[change.tempId] = updated.id
          break
        }
        case "sale:delete": {
          const sale = await prisma.sale.findUnique({ where: { id: data.id } })
          await prisma.saleItem.deleteMany({ where: { saleId: data.id } })
          await prisma.sale.delete({ where: { id: data.id } })
          if (sale?.orderId) {
            await prisma.order.update({ where: { id: sale.orderId }, data: { status: "PRONTO", updatedAt: new Date() } })
          }
          break
        }
        case "cashFlow:create": {
          const created = await prisma.cashFlow.create({
            data: {
              type: data.type,
              category: data.category,
              description: data.description,
              amount: data.amount,
              userId: data.userId,
              date: data.date ? new Date(data.date) : new Date(),
            },
          })
          if (change.tempId) mappings[change.tempId] = created.id
          break
        }
        case "cashFlow:update": {
          const { id, ...cashData } = data
          const patch: Record<string, unknown> = { ...cashData }
          if (cashData.date) patch.date = new Date(cashData.date)
          await prisma.cashFlow.update({ where: { id }, data: patch })
          break
        }
        case "cashFlow:delete": {
          await prisma.cashFlow.delete({ where: { id: data.id } })
          break
        }
        case "production:create": {
          const created = await prisma.production.create({
            data: {
              batchCode: data.batchCode,
              productId: data.productId,
              qty: data.qty,
              status: (data.status || "AGENDADA").toUpperCase(),
              notes: data.notes,
            },
          })
          if (change.tempId) mappings[change.tempId] = created.id
          break
        }
        case "production:update": {
          const { id, ...prodData } = data
          const patch: Record<string, unknown> = {}
          if (prodData.status) patch.status = prodData.status.toUpperCase()
          if (prodData.endTime) patch.endTime = new Date(prodData.endTime)
          if (prodData.notes !== undefined) patch.notes = prodData.notes
          if (prodData.qty !== undefined) patch.qty = prodData.qty
          await prisma.production.update({ where: { id }, data: patch })
          break
        }
        case "production:delete": {
          await prisma.production.delete({ where: { id: data.id } })
          break
        }
        case "ingredient:create": {
          const created = await prisma.ingredient.create({
            data: {
              name: data.name,
              brand: data.brand,
              stockKg: data.stockKg ?? 0,
              minStockKg: data.minStockKg ?? 0,
              costPerKg: data.costPerKg,
              supplier: data.supplier,
              caloriesPer100g: data.caloriesPer100g,
              proteinPer100g: data.proteinPer100g,
              carbsPer100g: data.carbsPer100g,
              fatPer100g: data.fatPer100g,
            },
          })
          if (change.tempId) mappings[change.tempId] = created.id
          break
        }
        case "ingredient:update": {
          const { id, ...updateData } = data
          await prisma.ingredient.update({
            where: { id },
            data: { ...updateData, updatedAt: new Date() },
          })
          break
        }
        case "ingredient:delete": {
          await prisma.ingredient.delete({ where: { id: data.id } })
          break
        }
        case "recipe:create": {
          const { ingredients, ...recipeData } = data
          const created = await prisma.recipe.create({
            data: {
              name: recipeData.name,
              yield: recipeData.yield,
              yieldUnit: recipeData.yieldUnit || "un",
              totalCost: recipeData.totalCost || 0,
              productId: recipeData.productId,
              ingredients: ingredients?.length
                ? { create: ingredients.map((i: { ingredientId: string; qty: number; unit: string }) => ({ ingredientId: i.ingredientId, qty: i.qty, unit: i.unit })) }
                : undefined,
            },
          })
          if (change.tempId) mappings[change.tempId] = created.id
          break
        }
        case "recipe:update": {
          const { id, ingredients, ...updateData } = data
          await prisma.$transaction(async (tx) => {
            await tx.recipe.update({ where: { id }, data: { ...updateData, updatedAt: new Date() } })
            if (ingredients && Array.isArray(ingredients)) {
              await tx.recipeItem.deleteMany({ where: { recipeId: id } })
              await tx.recipeItem.createMany({
                data: ingredients.map((i: { ingredientId: string; qty: number; unit: string }) => ({ recipeId: id, ingredientId: i.ingredientId, qty: i.qty, unit: i.unit })),
              })
            }
          })
          break
        }
        case "recipe:delete": {
          await prisma.recipe.delete({ where: { id: data.id } })
          break
        }
        case "document:create": {
          const created = await prisma.document.create({
            data: {
              title: data.title,
              description: data.description,
              category: data.category,
              content: data.content,
              fileUrl: data.fileUrl,
              tags: data.tags,
              userId: data.userId,
            },
          })
          if (change.tempId) mappings[change.tempId] = created.id
          break
        }
        case "document:update": {
          const { id, ...updateData } = data
          await prisma.document.update({ where: { id }, data: { ...updateData, updatedAt: new Date() } })
          break
        }
        case "document:delete": {
          await prisma.document.delete({ where: { id: data.id } })
          break
        }
        case "channel:create": {
          const created = await prisma.saleChannel.create({ data: { name: data.name, commission: data.commission ?? 0 } })
          if (change.tempId) mappings[change.tempId] = created.id
          break
        }
        case "channel:update": {
          const { id, ...updateData } = data
          await prisma.saleChannel.update({ where: { id }, data: updateData })
          break
        }
        case "channel:delete": {
          await prisma.saleChannel.delete({ where: { id: data.id } })
          break
        }
        case "priceTier:create": {
          const created = await prisma.priceTier.create({
            data: { productId: data.productId, name: data.name, minQty: data.minQty, maxQty: data.maxQty, price: data.price },
          })
          if (change.tempId) mappings[change.tempId] = created.id
          break
        }
        case "priceTier:update": {
          const { id, ...updateData } = data
          await prisma.priceTier.update({ where: { id }, data: updateData })
          break
        }
        case "priceTier:delete": {
          await prisma.priceTier.delete({ where: { id: data.id } })
          break
        }
        case "deliveryCost:create": {
          const created = await prisma.deliveryCost.create({
            data: {
              channel: data.channel,
              amount: data.amount,
              orderId: data.orderId,
              notes: data.notes,
              date: data.date ? new Date(data.date) : new Date(),
            },
          })
          if (change.tempId) mappings[change.tempId] = created.id
          break
        }
        case "deliveryCost:update": {
          const { id, ...updateData } = data
          const patch: Record<string, unknown> = { ...updateData }
          if (patch.date) patch.date = new Date(patch.date as string)
          await prisma.deliveryCost.update({ where: { id }, data: patch })
          break
        }
        case "deliveryCost:delete": {
          await prisma.deliveryCost.delete({ where: { id: data.id } })
          break
        }
      }
    } catch (e) {
      console.error(`Sync error for ${key}`, e)
      errors.push({ entity, action, message: "Erro ao aplicar alteração" })
    }
  }

  return NextResponse.json({ ok: errors.length === 0, mappings, errors })
}
