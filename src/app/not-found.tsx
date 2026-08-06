import Link from "next/link"

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-ink mb-4">Página não encontrada</h1>
        <p className="text-sm text-muted mb-8">A página que você procura não existe ou foi removida.</p>
        <Link href="/" className="text-sm text-accent underline underline-offset-4">
          Voltar para o início
        </Link>
      </div>
    </main>
  )
}
