"use client"

import { Button } from "@/components/ui/Button"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-ink mb-4">Algo deu errado</h1>
        <p className="text-sm text-muted mb-8">
          {error.message || "Ocorreu um erro inesperado. Tente novamente ou recarregue a página."}
        </p>
        <Button onClick={() => reset()}>Tentar novamente</Button>
      </div>
    </main>
  )
}