export function ShimmerSkeleton({
  className = "",
  variant = "card",
}: {
  className?: string
  variant?: "card" | "text" | "image" | "avatar"
}) {
  const variants = {
    card: "rounded-xl h-24 w-full",
    text: "rounded h-4 w-3/4",
    image: "rounded-xl aspect-square w-full",
    avatar: "rounded-full h-10 w-10",
  }

  return (
    <div
      className={`relative overflow-hidden bg-cream ${variants[variant]} ${className}`}
      role="status"
      aria-label="Carregando"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-cream via-kraft/20 to-cream animate-shimmer-sweep" />
    </div>
  )
}