"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CustomerShell } from "@/components/customer/CustomerShell"
import { GoogleLoginButton } from "@/components/customer/GoogleLoginButton"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { FormField } from "@/components/ui/FormField"
import { GlassSurface } from "@/components/ui/GlassSurface"

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  too_many_requests: "Muitas tentativas. Tente novamente em instantes.",
  invalid_state: "A sessão expirou. Tente novamente.",
  access_denied: "Acesso negado. Você não autorizou o Google.",
  not_configured: "Login com Google indisponível no momento.",
  server_error: "Não foi possível entrar com o Google. Tente novamente.",
}

export default function EntrarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper">
          <GlassSurface tone="strong" className="max-w-md mx-auto px-6 py-8 rounded-2xl">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-ink/5 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-accent" />
              </div>
              <p className="text-sm text-muted font-medium">Carregando...</p>
            </div>
          </GlassSurface>
        </div>
      }
    >
      <EntrarForm />
    </Suspense>
  )
}

function EntrarForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState(() => {
    const oauthError = searchParams.get("oauth_error")
    return oauthError ? (OAUTH_ERROR_MESSAGES[oauthError] ?? "") : ""
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const email = form.get("email") as string
    const password = form.get("password") as string

    const res = await fetch("/api/public/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || "E-mail ou senha inválidos")
      setLoading(false)
      return
    }

    const next = searchParams.get("next")
    router.push(next && next.startsWith("/") ? next : "/perfil")
    router.refresh()
  }

  return (
    <CustomerShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Entrar</h1>
          <p className="text-sm text-muted">Acompanhe seus pedidos e retiradas</p>
        </div>

        <div className="space-y-3">
          <GoogleLoginButton next={searchParams.get("next")} />
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-line" />
            <span className="text-xs text-muted">ou</span>
            <div className="flex-1 h-px bg-line" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Email" htmlFor="email" required>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="seu@email.com" required />
          </FormField>

          <FormField label="Senha" htmlFor="password" required>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="• • • • • • • •"
              required
            />
          </FormField>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="text-sm text-muted text-center">
          Não tem conta?{" "}
          <Link
            href={`/cadastro${searchParams.get("next") ? `?next=${searchParams.get("next")}` : ""}`}
            className="text-ink font-medium underline"
          >
            Cadastre-se
          </Link>
        </p>
      </div>
    </CustomerShell>
  )
}
