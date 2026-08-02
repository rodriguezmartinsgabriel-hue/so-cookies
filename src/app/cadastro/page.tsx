"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CustomerShell } from "@/components/customer/CustomerShell"

export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <CadastroForm />
    </Suspense>
  )
}

function CadastroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const name = form.get("name") as string
    const email = form.get("email") as string
    const phone = form.get("phone") as string
    const password = form.get("password") as string
    const confirm = form.get("confirm") as string

    if (password !== confirm) {
      setError("As senhas não coincidem")
      setLoading(false)
      return
    }

    const res = await fetch("/api/public/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone: phone || undefined, password }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || "Não foi possível criar a conta")
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
          <h1 className="text-2xl font-bold text-ink">Criar conta</h1>
          <p className="text-sm text-muted">Para pedir e acompanhar suas retiradas</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Nome
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Seu nome"
              required
              className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
            />
          </div>

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
            <label htmlFor="phone" className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Telefone (opcional)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="(11) 99999-9999"
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
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Confirmar senha
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-ink text-paper font-medium rounded-lg hover:bg-ink/90 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p className="text-sm text-muted text-center">
          Já tem conta?{" "}
          <Link href="/entrar" className="text-ink font-medium underline">
            Entrar
          </Link>
        </p>
      </div>
    </CustomerShell>
  )
}
