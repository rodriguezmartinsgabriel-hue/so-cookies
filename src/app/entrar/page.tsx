"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CustomerShell } from "@/components/customer/CustomerShell"
import { GoogleLoginButton } from "@/components/customer/GoogleLoginButton"

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  too_many_requests: "Muitas tentativas. Tente novamente em instantes.",
  invalid_state: "A sessão expirou. Tente novamente.",
  access_denied: "Acesso negado. Você não autorizou o Google.",
  not_configured: "Login com Google indisponível no momento.",
  server_error: "Não foi possível entrar com o Google. Tente novamente.",
}

export default function EntrarPage() {
  return (
    <Suspense fallback={null}>
      <EntrarForm />
    </Suspense>
  )
}

function EntrarForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState(() => {
    const oauthError = searchParams.get("oauth_error")
    return oauthError ? OAUTH_ERROR_MESSAGES[oauthError] ?? "" : ""
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
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
              className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-ink text-paper font-medium rounded-lg hover:bg-ink/90 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-sm text-muted text-center">
          Não tem conta?{" "}
          <Link href={`/cadastro${searchParams.get("next") ? `?next=${searchParams.get("next")}` : ""}`} className="text-ink font-medium underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </CustomerShell>
  )
}
