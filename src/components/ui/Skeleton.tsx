export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-cream rounded-md ${className}`} role="status" aria-label="Carregando">
      <div className="absolute inset-0 bg-gradient-to-r from-cream via-kraft/20 to-cream animate-shimmer-sweep" />
    </div>
  )
}