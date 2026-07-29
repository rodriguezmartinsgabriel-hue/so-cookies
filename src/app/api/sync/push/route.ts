import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { createSaleFromOrder } from "@/lib/db"

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const { changes } = await request.json()
    const mappings: Record<string, string> = {}
    let hasError = false

    for (const change of changes) {
      try {
        switch (`${change.entity}:${change.action}`) {
          case "order:create": {
            const { items, tempId, ...orderData } = change.data
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
            if (tempId) mappings[tempId] = created.id
            break
          }
          case "order:update": {
            const { id, ...updateData } = change.data
            const updated = await prisma.order.update({
              where: { id },
              data: { ...updateData, updatedAt: new Date() },
              include: { items: true, sale: true },
            })
            if (updateData.status === "CONCLUIDO" && !updated.sale) {
              await createSaleFromOrder(updated)
            }
            break
          }
          case "sale:create": {
            const { items, tempId, ...saleData } = change.data
            const created = await prisma.sale.create({
              data: {
                channelId: saleData.channelId,
                total: saleData.total,
                userId: saleData.userId,
                orderId: saleData.orderId,
                items: items ? { create: items.map((i: { productId: string; qty: number; price: number }) => ({ productId: i.productId, qty: i.qty, price: i.price })) } : undefined,
              },
            })
            if (tempId) mappings[tempId] = created.id
            break
          }
          case "cashFlow:create": {
            const { tempId, ...cashData } = change.data
            const created = await prisma.cashFlow.create({
              data: {
                type: cashData.type,
                category: cashData.category,
                description: cashData.description,
                amount: cashData.amount,
                userId: cashData.userId,
                date: new Date(cashData.date),
              },
            })
            if (tempId) mappings[tempId] = created.id
            break
          }
          case "production:create": {
            const { tempId, ...prodData } = change.data
            const created = await prisma.production.create({
              data: {
                batchCode: prodData.batchCode,
                productId: prodData.productId,
                qty: prodData.qty,
                status: prodData.status || "pendente",
                notes: prodData.notes,
              },
            })
            if (tempId) mappings[tempId] = created.id
            break
          }
          case "production:update": {
            await prisma.production.update({
              where: { id: change.data.id },
              data: {
                status: change.data.status,
                ...(change.data.endTime ? { endTime: new Date(change.data.endTime) } : {}),
              },
            })
            break
          }
          case "ingredient:create": {
            const { tempId, ...ingredientData } = change.data
            const created = await prisma.ingredient.create({
              data: {
                name: ingredientData.name,
                brand: ingredientData.brand,
                stockKg: ingredientData.stockKg ?? 0,
                minStockKg: ingredientData.minStockKg ?? 0,
                costPerKg: ingredientData.costPerKg,
                supplier: ingredientData.supplier,
                caloriesPer100g: ingredientData.caloriesPer100g,
                proteinPer100g: ingredientData.proteinPer100g,
                carbsPer100g: ingredientData.carbsPer100g,
                fatPer100g: ingredientData.fatPer100g,
              },
            })
            if (tempId) mappings[tempId] = created.id
            break
          }
          case "ingredient:update": {
            const { id, ...updateData } = change.data
            await prisma.ingredient.update({
              where: { id },
              data: { ...updateData, updatedAt: new Date() },
            })
            break
          }
          case "ingredient:delete": {
            await prisma.ingredient.delete({ where: { id: change.data.id } })
            break
          }
          case "recipe:create": {
            const { ingredients, tempId, ...recipeData } = change.data
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
            if (tempId) mappings[tempId] = created.id
            break
          }
          case "recipe:update": {
            const { id, ingredients: recipeIngredients, ...updateData } = change.data
            await prisma.recipe.update({ where: { id }, data: { ...updateData, updatedAt: new Date() } })
            if (recipeIngredients && Array.isArray(recipeIngredients)) {
              await prisma.recipeItem.deleteMany({ where: { recipeId: id } })
              await prisma.recipeItem.createMany({
                data: recipeIngredients.map((i: { ingredientId: string; qty: number; unit: string }) => ({ recipeId: id, ingredientId: i.ingredientId, qty: i.qty, unit: i.unit })),
              })
            }
            break
          }
          case "recipe:delete": {
            await prisma.recipe.delete({ where: { id: change.data.id } })
            break
          }
          case "document:create": {
            const { tempId: docTempId, ...docData } = change.data
            const created = await prisma.document.create({ data: docData })
            if (docTempId) mappings[docTempId] = created.id
            break
          }
          case "document:update": {
            const { id: docId, ...docUpdateData } = change.data
            await prisma.document.update({ where: { id: docId }, data: { ...docUpdateData, updatedAt: new Date() } })
            break
          }
          case "document:delete": {
            await prisma.document.delete({ where: { id: change.data.id } })
            break
          }
          case "deliveryCost:create": {
            const { tempId: dcTempId, ...dcData } = change.data
            const created = await prisma.deliveryCost.create({
              data: {
                channel: dcData.channel,
                amount: dcData.amount,
                orderId: dcData.orderId,
                notes: dcData.notes,
                date: new Date(dcData.date),
              },
            })
            if (dcTempId) mappings[dcTempId] = created.id
            break
          }
          case "deliveryCost:update": {
            const { id: dcId, ...dcUpdateData } = change.data
            const patch: any = { ...dcUpdateData }
            if (patch.date) patch.date = new Date(patch.date)
            await prisma.deliveryCost.update({ where: { id: dcId }, data: patch })
            break
          }
          case "deliveryCost:delete": {
            await prisma.deliveryCost.delete({ where: { id: change.data.id } })
            break
          }
        }
      } catch (e) {
        hasError = true
        console.error(`Sync error for ${change.entity}:${change.action}`, e)
      }
    }

    return NextResponse.json({ ok: !hasError, mappings })
  } catch (e) {
    return NextResponse.json({ error: "Erro no sync push" }, { status: 500 })
  }
}