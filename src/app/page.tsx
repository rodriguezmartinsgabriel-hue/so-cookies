import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { InstallBanner } from "@/components/pwa/InstallBanner"

export default async function HomePage() {
  const session = await auth()
  if (session) redirect("/pedidos")

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6">
      <div className="space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="font-brand text-6xl text-ink">Só Manager</h1>
          <p className="text-muted text-lg">
            Gestão completa do seu negócio de cookies.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/login"
            className="inline-block rounded-lg bg-ink px-8 py-3 font-semibold text-paper transition-colors hover:bg-ink/80"
          >
            Entrar
          </Link>
        </div>
      </div>

      <InstallBanner />
    </main>
  )
}
