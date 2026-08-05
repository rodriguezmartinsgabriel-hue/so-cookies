import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { createPixPayment, getPixPayment } from "./mercadopago"
import { PAYMENT_PROVIDER, PAYMENT_TTL_MS, isMercadoPagoConfigured, mpNotificationUrl } from "./config"
import { PaymentError } from "./errors"

type PaymentEventInput = {
  orderId?: string | null
  paymentId?: string | null
  action: string
  status?: string
  payload?: unknown
}

async function logPaymentEvent(input: PaymentEventInput): Promise<void> {
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

  const expiresAt = new Date(Date.now() + PAYMENT_TTL_MS)
  const externalRef = `order:${order.id}`

  const payment = await createPixPayment({
    transactionAmount: order.total,
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

  let order: { id: string; total: number; status: string; paymentStatus: string | null } | null = null
  const externalRef = payment.external_reference
  if (externalRef?.startsWith("order:")) {
    order = await prisma.order.findUnique({
      where: { id: externalRef.slice("order:".length) },
      select: { id: true, total: true, status: true, paymentStatus: true },
    })
  }
  if (!order) {
    order = await prisma.order.findUnique({
      where: { paymentProviderId: input.paymentId },
      select: { id: true, total: true, status: true, paymentStatus: true },
    })
  }

  if (!order) {
    await logPaymentEvent({
      paymentId: input.paymentId,
      action: "payment.updated",
      status: "IGNORED",
      payload: { status: payment.status, external_reference: externalRef },
    })
    return { ok: true, action: "ignored" }
  }

  const amountMatches = Math.abs(payment.transaction_amount - order.total) <= 0.01
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

  if (payment.status === "approved") {
    if (order.paymentStatus === "PAGO") {
      return { ok: true, action: "already_paid" }
    }
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "CONFIRMADO",
        paymentStatus: "PAGO",
        paidAt: new Date(),
        updatedAt: new Date(),
      },
    })
    await logPaymentEvent({
      orderId: order.id,
      paymentId: input.paymentId,
      action: "payment.approved",
      status: "VERIFIED",
      payload: { status: payment.status, status_detail: payment.status_detail },
    })
    return { ok: true, action: "paid" }
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
