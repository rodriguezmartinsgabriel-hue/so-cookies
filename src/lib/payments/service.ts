import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import type { Decimal } from "@prisma/client/runtime/client"
import { createPixPayment, getPixPayment } from "./mercadopago"
import { PAYMENT_PROVIDER, PAYMENT_TTL_MS, MIN_TRANSACTION_AMOUNT, MAX_TRANSACTION_AMOUNT, isMercadoPagoConfigured, mpNotificationUrl, logPaymentConfigWarnings } from "./config"
import { PaymentError } from "./errors"
import { toNumber } from "../utils"
import { LoyaltyService } from "../loyalty/service"

type PaymentEventInput = {
  orderId?: string | null
  paymentId?: string | null
  action: string
  status?: string
  payload?: unknown
}

export async function logPaymentEvent(input: PaymentEventInput): Promise<void> {
  await prisma.paymentEvent.create({
    data: {
      orderId: input.orderId ?? null,
      paymentId: input.paymentId ?? null,
      type: "payment",
      action: input.action,
      status: input.status ?? "RECEIVED",
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
    },
  })
}

export async function createOrderPayment(orderId: string) {
  logPaymentConfigWarnings()
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customerRef: { select: { email: true } } },
  })
  if (!order) throw new PaymentError("ORDER_NOT_FOUND", "Pedido não encontrado")
  if (order.paymentStatus === "PAGO") throw new PaymentError("ALREADY_PAID", "Pedido já pago")
  if (!isMercadoPagoConfigured()) {
    throw new PaymentError("PAYMENTS_DISABLED", "Pagamento online indisponível no momento")
  }

  const payerEmail = order.customerRef?.email
  if (!payerEmail) throw new PaymentError("NO_PAYER_EMAIL", "Cliente sem e-mail cadastrado para pagamento")

  const amount = toNumber(order.total)
  if (!Number.isFinite(amount) || amount < MIN_TRANSACTION_AMOUNT) {
    throw new PaymentError("INVALID_AMOUNT", `Valor do pedido inválido para pagamento: ${amount}`)
  }
  if (amount > MAX_TRANSACTION_AMOUNT) {
    throw new PaymentError("INVALID_AMOUNT", `Valor do pedido excede o limite permitido: ${amount}`)
  }

  const expiresAt = new Date(Date.now() + PAYMENT_TTL_MS)
  const externalRef = `order:${order.id}`

  const payment = await createPixPayment({
    transactionAmount: amount,
    description: `Pedido Só Cookies & Café ${order.pickupCode ?? ""}`.trim(),
    payerEmail,
    externalReference: externalRef,
    notificationUrl: mpNotificationUrl(),
    expiresAt,
  })

  await logPaymentEvent({
    orderId: order.id,
    paymentId: String(payment.id),
    action: "payment.created",
    status: "VERIFIED",
    payload: { status: payment.status },
  })

  return prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "AGUARDANDO_PAGAMENTO",
      paymentProvider: PAYMENT_PROVIDER,
      paymentProviderId: String(payment.id),
      paymentExternalRef: externalRef,
      paymentQrCode: payment.qrCode,
      paymentQrCodeBase64: payment.qrCodeBase64,
      paymentExpiresAt: expiresAt,
    },
  })
}

type OrderPaymentRef = {
  id: string
  total: Decimal | number
  status: string
  paymentStatus: string | null
  paymentProviderId: string | null
}

async function findOrderByPayment(payment: Awaited<ReturnType<typeof getPixPayment>>): Promise<OrderPaymentRef | null> {
  const externalRef = payment.external_reference
  if (externalRef?.startsWith("order:")) {
    const order = await prisma.order.findUnique({
      where: { id: externalRef.slice("order:".length) },
      select: { id: true, total: true, status: true, paymentStatus: true, paymentProviderId: true },
    })
    if (order) return order
  }
  return prisma.order.findUnique({
    where: { paymentProviderId: String(payment.id) },
    select: { id: true, total: true, status: true, paymentStatus: true, paymentProviderId: true },
  })
}

/**
 * Confirma um pedido como PAGO de forma idempotente (guarda no updateMany).
 * Retorna `false` quando o pedido já estava PAGO (evita crédito duplo de pontos).
 */
export async function applyApprovedPayment(
  orderId: string,
  payment: { id: number | string; status?: string; status_detail?: string | null; transaction_amount: number },
): Promise<boolean> {
  const result = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { not: "PAGO" } },
    data: {
      status: "CONFIRMADO",
      paymentStatus: "PAGO",
      paidAt: new Date(),
      updatedAt: new Date(),
    },
  })
  if (result.count === 0) return false

  await logPaymentEvent({
    orderId,
    paymentId: String(payment.id),
    action: "payment.approved",
    status: "VERIFIED",
    payload: { status: payment.status ?? "approved", status_detail: payment.status_detail ?? null },
  })

  try {
    await LoyaltyService.creditOnPayment(orderId)
  } catch (err) {
    await logPaymentEvent({
      orderId,
      paymentId: String(payment.id),
      action: "loyalty.credit.failed",
      status: "IGNORED",
      payload: { error: err instanceof Error ? err.message : String(err) },
    })
  }

  return true
}

/**
 * Reconciliação com o Mercado Pago: consulta o status do PIX do pedido e
 * confirma o pagamento caso o provedor já o tenha aprovado (webhook pode ter
 * falhado). Usada no polling do cliente e antes de gerar um novo PIX no retry.
 */
export async function reconcileOrderPayment(order: {
  id: string
  total: Decimal | number
  paymentStatus: string | null
  paymentProviderId: string | null
}): Promise<boolean> {
  if (!isMercadoPagoConfigured()) return false
  if (!order.paymentProviderId || order.paymentStatus === "PAGO") return false

  let payment: Awaited<ReturnType<typeof getPixPayment>>
  try {
    payment = await getPixPayment(order.paymentProviderId)
  } catch (err) {
    if (err instanceof PaymentError && err.code === "PAYMENT_NOT_FOUND") {
      await logPaymentEvent({
        orderId: order.id,
        paymentId: order.paymentProviderId,
        action: "payment.reconcile",
        status: "IGNORED",
        payload: { error: "payment_not_found" },
      })
      return false
    }
    throw err
  }

  const amountMatches = Math.abs(payment.transaction_amount - toNumber(order.total)) <= 0.01
  if (!amountMatches) {
    await logPaymentEvent({
      orderId: order.id,
      paymentId: order.paymentProviderId,
      action: "amount.mismatch",
      status: "IGNORED",
      payload: { received: payment.transaction_amount, expected: order.total },
    })
    return false
  }

  if (payment.status !== "approved") return false

  return applyApprovedPayment(order.id, payment)
}

export async function handlePaymentWebhook(input: { paymentId: string }): Promise<{ ok: true; action: string }> {
  let payment: Awaited<ReturnType<typeof getPixPayment>>
  try {
    payment = await getPixPayment(input.paymentId)
  } catch (error) {
    if (error instanceof PaymentError && error.code === "PAYMENT_NOT_FOUND") {
      await logPaymentEvent({
        paymentId: input.paymentId,
        action: "payment.updated",
        status: "IGNORED",
        payload: { error: "payment_not_found" },
      })
      return { ok: true, action: "payment_not_found" }
    }
    throw error
  }

  const order = await findOrderByPayment(payment)
  if (!order) {
    await logPaymentEvent({
      paymentId: input.paymentId,
      action: "payment.updated",
      status: "IGNORED",
      payload: { status: payment.status, external_reference: payment.external_reference },
    })
    return { ok: true, action: "ignored" }
  }

  const amountMatches = Math.abs(payment.transaction_amount - toNumber(order.total)) <= 0.01
  if (!amountMatches) {
    await logPaymentEvent({
      orderId: order.id,
      paymentId: input.paymentId,
      action: "amount.mismatch",
      status: "IGNORED",
      payload: { received: payment.transaction_amount, expected: order.total },
    })
    return { ok: true, action: "amount_mismatch" }
  }

  // Pagamento de um PIX antigo (retry gerou outro): ignora para não confirmar
  // o pedido com o valor de uma cobrança que já foi substituída.
  if (order.paymentProviderId && order.paymentProviderId !== String(input.paymentId)) {
    await logPaymentEvent({
      orderId: order.id,
      paymentId: input.paymentId,
      action: "payment.updated",
      status: "STALE",
      payload: { status: payment.status, currentProviderId: order.paymentProviderId },
    })
    return { ok: true, action: "stale_payment" }
  }

  if (payment.status === "approved") {
    const applied = await applyApprovedPayment(order.id, payment)
    return { ok: true, action: applied ? "paid" : "already_paid" }
  }

  await logPaymentEvent({
    orderId: order.id,
    paymentId: input.paymentId,
    action: "payment.updated",
    status: "VERIFIED",
    payload: { status: payment.status, status_detail: payment.status_detail },
  })
  return { ok: true, action: "not_approved" }
}

/**
 * Reconciliação ativa de todos os pedidos pendentes com o Mercado Pago.
 * Usada por cron/agendamento para confirmar pagamentos mesmo quando o
 * webhook falhou e o cliente não reabriu a página (que dispara o polling).
 */
export async function reconcileAllPendingOrderPayments(): Promise<{ checked: number; reconciled: number; failed: number }> {
  if (!isMercadoPagoConfigured()) return { checked: 0, reconciled: 0, failed: 0 }

  const pending = await prisma.order.findMany({
    where: {
      paymentStatus: "AGUARDANDO_PAGAMENTO",
      paymentProviderId: { not: null },
      paymentExpiresAt: { gt: new Date() },
    },
    take: 200,
    select: { id: true, total: true, paymentStatus: true, paymentProviderId: true },
  })

  let reconciled = 0
  let failed = 0
  for (const order of pending) {
    try {
      const ok = await reconcileOrderPayment(order)
      if (ok) reconciled += 1
    } catch (err) {
      failed += 1
      await logPaymentEvent({
        orderId: order.id,
        paymentId: order.paymentProviderId,
        action: "payment.reconcile.failed",
        status: "ERROR",
        payload: { error: err instanceof Error ? err.message : String(err) },
      })
    }
  }

  if (pending.length > 0) {
    await logPaymentEvent({
      orderId: null,
      action: "payment.reconcile.batch",
      status: "VERIFIED",
      payload: { checked: pending.length, reconciled, failed },
    })
  }

  return { checked: pending.length, reconciled, failed }
}

export async function expireUnpaidOrders(): Promise<number> {
  const now = new Date()
  const expired = await prisma.order.findMany({
    where: {
      paymentStatus: "AGUARDANDO_PAGAMENTO",
      paymentExpiresAt: { lt: now },
      status: "PENDENTE",
    },
    select: { id: true },
  })
  if (expired.length === 0) return 0
  await prisma.order.updateMany({
    where: { id: { in: expired.map((o) => o.id) } },
    data: { paymentStatus: "EXPIRADO", status: "CANCELADO", updatedAt: now },
  })
  await logPaymentEvent({
    orderId: null,
    action: "payment.expired",
    status: "VERIFIED",
    payload: { orders: expired.map((o) => o.id) },
  })
  return expired.length
}

export { isMercadoPagoConfigured }
