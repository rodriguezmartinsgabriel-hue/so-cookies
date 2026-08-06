import { z } from "zod"

export const MAX_WEBHOOK_BODY_BYTES = 256 * 1024

const idField = z.union([z.string(), z.number()])

export const ifoodWebhookSchema = z
  .object({
    code: z.string().optional(),
    id: idField.optional(),
    orderId: idField.optional(),
    createdAt: z.string().optional(),
  })
  .refine((v) => v.code === "presence" || (v.id !== undefined && v.orderId !== undefined), {
    message: "Evento iFood deve conter id e orderId (ou ser presence)",
  })

export const ninentyNineFoodWebhookSchema = z.object({
  eventId: idField,
  eventType: z.string().min(1),
  orderId: idField,
  orderURL: z.string().optional(),
  createdAt: z.string().optional(),
})

export function isBodyTooLarge(request: Request, body: string): boolean {
  const contentLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BODY_BYTES) {
    return true
  }
  return Buffer.byteLength(body, "utf8") > MAX_WEBHOOK_BODY_BYTES
}
