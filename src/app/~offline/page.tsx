export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <div className="space-y-4">
        <h1 className="font-brand text-5xl text-ink">Só Manager</h1>
        <p className="text-muted text-lg">
          Você está offline.
        </p>
        <p className="text-muted text-sm">
          Verifique sua conexão com a internet e tente novamente.
        </p>
      </div>
    </main>
  )
}