import { z } from "zod"

export const credentials99FoodSchema = z.object({
  appId: z.string().min(1, "APP ID é obrigatório"),
  appShoppId: z.string().min(1, "APP Shopp ID é obrigatório"),
  clientSecret: z.string().min(1, "Client Secret é obrigatório"),
})

export const credentialsIfoodSchema = z.object({
  clientId: z.string().min(1, "Client ID é obrigatório"),
  clientSecret: z.string().min(1, "Client Secret é obrigatório"),
})

export const accountCredentialsSchema = z.union([credentials99FoodSchema, credentialsIfoodSchema])

export const accountCreateSchema = z.discriminatedUnion("platform", [
  z.object({
    platform: z.literal("99FOOD"),
    storeName: z.string().min(1, "Nome da loja é obrigatório"),
    credentials: credentials99FoodSchema,
    enabled: z.boolean().optional(),
  }),
  z.object({
    platform: z.literal("IFOOD"),
    storeName: z.string().min(1, "Nome da loja é obrigatório"),
    credentials: credentialsIfoodSchema,
    enabled: z.boolean().optional(),
  }),
])

export const accountUpdateSchema = z.object({
  storeName: z.string().min(1, "Nome da loja é obrigatório").optional(),
  enabled: z.boolean().optional(),
  credentials: accountCredentialsSchema.optional(),
})
