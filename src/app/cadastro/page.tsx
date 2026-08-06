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

export default function CadastroPage() {
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

        <div className="space-y-3">
          <GoogleLoginButton next={searchParams.get("next")} />
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-line" />
            <span className="text-xs text-muted">ou</span>
            <div className="flex-1 h-px bg-line" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Nome" htmlFor="name" required>
            <Input id="name" name="name" type="text" autoComplete="name" placeholder="Seu nome" required />
          </FormField>

          <FormField label="Email" htmlFor="email" required>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="seu@email.com" required />
          </FormField>

          <FormField label="Telefone (opcional)" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="(11) 99999-9999" />
          </FormField>

          <FormField label="Senha" htmlFor="password" required>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </FormField>

          <FormField label="Confirmar senha" htmlFor="confirm" required>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="• • • • • • • •"
              required
              minLength={6}
            />
          </FormField>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </Button>
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
