export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-kraft/50 rounded-md ${className}`} role="status" aria-label="Carregando" />
}
