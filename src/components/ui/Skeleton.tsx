import { cn } from "@/lib/utils"

type SkeletonVariant = "text" | "card" | "image" | "avatar"

const variants: Record<SkeletonVariant, string> = {
  text: "h-4 w-3/4 rounded",
  card: "h-24 w-full rounded-md",
  image: "aspect-square w-full rounded-md",
  avatar: "h-10 w-10 rounded-full",
}

export function Skeleton({ className = "", variant = "card" }: { className?: string; variant?: SkeletonVariant }) {
  return (
    <div
      className={cn("relative overflow-hidden bg-cream", variants[variant], className)}
      role="status"
      aria-label="Carregando"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-cream via-kraft/20 to-cream animate-shimmer-sweep" />
    </div>
  )
}
