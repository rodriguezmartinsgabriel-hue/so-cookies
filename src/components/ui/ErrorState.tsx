import { AlertTriangle } from "lucide-react"

export function ErrorState({ message = "Algo deu errado", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
      <AlertTriangle className="w-8 h-8 text-danger mb-3" strokeWidth={1.5} />
      <p className="text-sm font-medium text-ink mb-1">{message}</p>
      <p className="text-xs text-muted mb-4">Tente novamente ou verifique sua conexão</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm font-medium bg-ink text-paper rounded-lg hover:opacity-90 transition-opacity"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}
