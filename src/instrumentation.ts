import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET é obrigatória"),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().optional(),
  MERCADO_PAGO_NOTIFICATION_URL: z.string().url().optional(),
})

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n")
    throw new Error(`[startup] Variáveis de ambiente obrigatórias faltando:\n${issues}`)
  }

  if (!result.data.MERCADO_PAGO_ACCESS_TOKEN) {
    console.warn("[startup] MERCADO_PAGO_ACCESS_TOKEN não configurada — pagamentos desabilitados")
  } else {
    if (!result.data.MERCADO_PAGO_WEBHOOK_SECRET) {
      console.warn("[startup] MERCADO_PAGO_WEBHOOK_SECRET não configurada — webhooks serão rejeitados")
    }
    if (!result.data.MERCADO_PAGO_NOTIFICATION_URL) {
      console.warn("[startup] MERCADO_PAGO_NOTIFICATION_URL não configurada — confirmação automática via webhook indisponível")
    }
  }
}
