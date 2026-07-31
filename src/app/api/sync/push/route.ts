import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { requireAuth } from "@/lib/api-auth"
import { applyOrderUpdate } from "@/lib/db"
import { resolveRefs, runDelete } from "@/lib/sync-refs"
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
  createContactSchema,
  updateContactSchema,
  createInteractionSchema,
} from "@/lib/validation"

const ROLE_HIERARCHY: Record<string, number> = { ADMIN: 3, OPERACIONAL: 2, VISUALIZADOR: 1 }

function minRoleFor(entity: string, action: string): "ADMIN" | "OPERACIONAL" {
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
  "contact:create": createContactSchema,
  "contact:update": updateContactSchema.extend({ id: z.string().min(1) }),
  "contact:delete": idSchema,
  "contactInteraction:create": createInteractionSchema.extend({ contactId: z.string().min(1) }),
  "contactInteraction:delete": idSchema,
}

type Tx = Prisma.TransactionClient

interface ProcessedEntry {
  queueId?: number | null
  ok: boolean
  tempId?: string
  realId?: string
  error?: string
}

async function applyCreate(
  entity: string,
  tempId: string | undefined,
  create: (tx: Tx) => Promise<{ id: string }>
): Promise<string> {
  if (!tempId) {
    const created = await create(prisma)
    return created.id
  }
  const existing = await prisma.syncApply.findUnique({ where: { entity_tempId: { entity, tempId } } })
  if (existing) return existing.realId
  try {
    const created = await prisma.$transaction(async (tx) => {
      const row = await create(tx)
      await tx.syncApply.create({ data: { entity, tempId, realId: row.id } })
      return row
    })
    return created.id
  } catch (e) {
    const dup = await prisma.syncApply.findUnique({ where: { entity_tempId: { entity, tempId } } })
    if (dup) return dup.realId
    throw e
  }
}

export async function POST(request: Request) {
  const { error, session } = await requireAuth("OPERACIONAL")
  if (error) return error

  let changes: unknown
  try {
    const body = await request.json()
    changes = body?.changes
  } catch {
    return NextResponse.json({ ok: true, processed: [] })
  }
  if (!Array.isArray(changes) || changes.length === 0) {
    return NextResponse.json({ ok: true, processed: [] })
  }

  const userLevel = ROLE_HIERARCHY[(session?.user?.role as string) || ""] || 0
  const processed: ProcessedEntry[] = []
  const sessionMap = new Map<string, string>()

  for (const change of changes) {
    const entity = change?.entity as string
    const action = change?.action as string
    const key = `${entity}:${action}`
    const tempId = change?.tempId as string | undefined
    const entry: ProcessedEntry = { queueId: change?.id as number | null | undefined, ok: false }

    if (!key || !syncSchemas[key]) {
      entry.error = "Tipo de alteração não suportado"
      processed.push(entry)
      continue
    }

    const requiredRole = minRoleFor(entity, action)
    if (userLevel < ROLE_HIERARCHY[requiredRole]) {
      entry.error = "Sem permissão"
      processed.push(entry)
      continue
    }

    let data: any
    try {
      data = syncSchemas[key].parse(change.data)
    } catch (e: any) {
      entry.error = e?.issues?.[0]?.message || "Dados inválidos"
      processed.push(entry)
      continue
    }

    data = resolveRefs(data, sessionMap)

    try {
      switch (key) {
        case "order:create": {
          const { items, ...orderData } = data
          const realId = await applyCreate("order", tempId, (tx) =>
            tx.order.create({
              data: {
                channel: orderData.channel,
                customer: orderData.customer,
                total: orderData.total,
                status: orderData.status || "PENDENTE",
                notes: orderData.notes,
                items: items ? { create: items.map((i: { productId: string; qty: number; price: number }) => ({ productId: i.productId, qty: i.qty, price: i.price })) } : undefined,
              },
            })
          )
          entry.ok = true
          entry.tempId = tempId
          entry.realId = realId
          break
        }
        case "order:update": {
          const { id, ...updateData } = data
          const updated = await applyOrderUpdate(id, updateData)
          entry.ok = true
          entry.realId = updated.id
          break
        }
        case "order:delete": {
          await runDelete(() => prisma.order.delete({ where: { id: data.id } }))
          entry.ok = true
          break
        }
        case "sale:create": {
          const { items, ...saleData } = data
          const realId = await applyCreate("sale", tempId, (tx) =>
            tx.sale.create({
              data: {
                channelId: saleData.channelId,
                total: saleData.total,
                userId: saleData.userId,
                items: items ? { create: items.map((i: { productId: string; qty: number; price: number }) => ({ productId: i.productId, qty: i.qty, price: i.price })) } : undefined,
              },
            })
          )
          entry.ok = true
          entry.tempId = tempId
          entry.realId = realId
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
          entry.ok = true
          entry.realId = updated.id
          break
        }
        case "sale:delete": {
          const sale = await prisma.sale.findUnique({ where: { id: data.id } })
          await prisma.saleItem.deleteMany({ where: { saleId: data.id } })
          await runDelete(() => prisma.sale.delete({ where: { id: data.id } }))
          if (sale?.orderId) {
            await prisma.order.update({ where: { id: sale.orderId }, data: { status: "PRONTO", updatedAt: new Date() } })
          }
          entry.ok = true
          break
        }
        case "cashFlow:create": {
          const description = (data.description as string | undefined)?.trim() || "Sem descrição"
          const realId = await applyCreate("cashFlow", tempId, (tx) =>
            tx.cashFlow.create({
              data: {
                type: data.type,
                category: data.category,
                description,
                amount: data.amount,
                userId: data.userId,
                date: data.date ? new Date(data.date) : new Date(),
              },
            })
          )
          entry.ok = true
          entry.tempId = tempId
          entry.realId = realId
          break
        }
        case "cashFlow:update": {
          const { id, ...cashData } = data
          const patch: Record<string, unknown> = { ...cashData }
          if (cashData.date) patch.date = new Date(cashData.date)
          if (cashData.description !== undefined) patch.description = (cashData.description as string).trim() || "Sem descrição"
          await prisma.cashFlow.update({ where: { id }, data: patch })
          entry.ok = true
          break
        }
        case "cashFlow:delete": {
          await runDelete(() => prisma.cashFlow.delete({ where: { id: data.id } }))
          entry.ok = true
          break
        }
        case "production:create": {
          const realId = await applyCreate("production", tempId, (tx) =>
            tx.production.create({
              data: {
                batchCode: data.batchCode,
                productId: data.productId,
                qty: data.qty,
                status: (data.status || "AGENDADA").toUpperCase(),
                notes: data.notes,
              },
            })
          )
          entry.ok = true
          entry.tempId = tempId
          entry.realId = realId
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
          entry.ok = true
          break
        }
        case "production:delete": {
          await runDelete(() => prisma.production.delete({ where: { id: data.id } }))
          entry.ok = true
          break
        }
        case "ingredient:create": {
          const realId = await applyCreate("ingredient", tempId, (tx) =>
            tx.ingredient.create({
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
          )
          entry.ok = true
          entry.tempId = tempId
          entry.realId = realId
          break
        }
        case "ingredient:update": {
          const { id, ...updateData } = data
          await prisma.ingredient.update({
            where: { id },
            data: { ...updateData, updatedAt: new Date() },
          })
          entry.ok = true
          break
        }
        case "ingredient:delete": {
          await runDelete(() => prisma.ingredient.delete({ where: { id: data.id } }))
          entry.ok = true
          break
        }
        case "recipe:create": {
          const { ingredients, ...recipeData } = data
          const realId = await applyCreate("recipe", tempId, (tx) =>
            tx.recipe.create({
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
          )
          entry.ok = true
          entry.tempId = tempId
          entry.realId = realId
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
          entry.ok = true
          break
        }
        case "recipe:delete": {
          await runDelete(() => prisma.recipe.delete({ where: { id: data.id } }))
          entry.ok = true
          break
        }
        case "document:create": {
          const realId = await applyCreate("document", tempId, (tx) =>
            tx.document.create({
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
          )
          entry.ok = true
          entry.tempId = tempId
          entry.realId = realId
          break
        }
        case "document:update": {
          const { id, ...updateData } = data
          await prisma.document.update({ where: { id }, data: { ...updateData, updatedAt: new Date() } })
          entry.ok = true
          break
        }
        case "document:delete": {
          await runDelete(() => prisma.document.delete({ where: { id: data.id } }))
          entry.ok = true
          break
        }
        case "channel:create": {
          const realId = await applyCreate("channel", tempId, (tx) => tx.saleChannel.create({ data: { name: data.name, commission: data.commission ?? 0 } }))
          entry.ok = true
          entry.tempId = tempId
          entry.realId = realId
          break
        }
        case "channel:update": {
          const { id, ...updateData } = data
          await prisma.saleChannel.update({ where: { id }, data: updateData })
          entry.ok = true
          break
        }
        case "channel:delete": {
          await runDelete(() => prisma.saleChannel.delete({ where: { id: data.id } }))
          entry.ok = true
          break
        }
        case "priceTier:create": {
          const realId = await applyCreate("priceTier", tempId, (tx) =>
            tx.priceTier.create({
              data: { productId: data.productId, name: data.name, minQty: data.minQty, maxQty: data.maxQty, price: data.price },
            })
          )
          entry.ok = true
          entry.tempId = tempId
          entry.realId = realId
          break
        }
        case "priceTier:update": {
          const { id, ...updateData } = data
          await prisma.priceTier.update({ where: { id }, data: updateData })
          entry.ok = true
          break
        }
        case "priceTier:delete": {
          await runDelete(() => prisma.priceTier.delete({ where: { id: data.id } }))
          entry.ok = true
          break
        }
        case "deliveryCost:create": {
          const realId = await applyCreate("deliveryCost", tempId, (tx) =>
            tx.deliveryCost.create({
              data: {
                channel: data.channel,
                amount: data.amount,
                orderId: data.orderId,
                notes: data.notes,
                date: data.date ? new Date(data.date) : new Date(),
              },
            })
          )
          entry.ok = true
          entry.tempId = tempId
          entry.realId = realId
          break
        }
        case "deliveryCost:update": {
          const { id, ...updateData } = data
          const patch: Record<string, unknown> = { ...updateData }
          if (patch.date) patch.date = new Date(patch.date as string)
          await prisma.deliveryCost.update({ where: { id }, data: patch })
          entry.ok = true
          break
        }
        case "deliveryCost:delete": {
          await runDelete(() => prisma.deliveryCost.delete({ where: { id: data.id } }))
          entry.ok = true
          break
        }
        case "contact:create": {
          const realId = await applyCreate("contact", tempId, (tx) =>
            tx.contact.create({
              data: {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                type: data.type || "CLIENTE",
                company: data.company || null,
                notes: data.notes || null,
              },
            })
          )
          entry.ok = true
          entry.tempId = tempId
          entry.realId = realId
          break
        }
        case "contact:update": {
          const { id, ...updateData } = data
          const patch: Record<string, unknown> = { ...updateData, updatedAt: new Date() }
          if (updateData.email !== undefined) patch.email = updateData.email || null
          if (updateData.phone !== undefined) patch.phone = updateData.phone || null
          if (updateData.company !== undefined) patch.company = updateData.company || null
          if (updateData.notes !== undefined) patch.notes = updateData.notes || null
          await prisma.contact.update({ where: { id }, data: patch })
          entry.ok = true
          break
        }
        case "contact:delete": {
          await prisma.contactInteraction.deleteMany({ where: { contactId: data.id } })
          await runDelete(() => prisma.contact.delete({ where: { id: data.id } }))
          entry.ok = true
          break
        }
        case "contactInteraction:create": {
          const { contactId, ...interactionData } = data
          const realId = await applyCreate("contactInteraction", tempId, (tx) =>
            tx.contactInteraction.create({
              data: { contactId, type: interactionData.type || "NOTA", note: interactionData.note },
            })
          )
          entry.ok = true
          entry.tempId = tempId
          entry.realId = realId
          break
        }
        case "contactInteraction:delete": {
          await runDelete(() => prisma.contactInteraction.delete({ where: { id: data.id } }))
          entry.ok = true
          break
        }
      }
    } catch (e) {
      console.error(`Sync error for ${key}`, e)
      entry.error = "Erro ao aplicar alteração"
    }
    if (entry.ok && entry.tempId && entry.realId) {
      sessionMap.set(entry.tempId, entry.realId)
    }
    processed.push(entry)
  }

  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    await prisma.syncApply.deleteMany({ where: { appliedAt: { lt: cutoff } } })
  } catch (e) {
    console.error("Falha ao purgar SyncApply:", e)
  }

  return NextResponse.json({ ok: processed.every((p) => p.ok), processed })
}
