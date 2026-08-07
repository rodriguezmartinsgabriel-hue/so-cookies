import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full h-10 px-3 border border-line rounded-xl bg-paper text-base text-ink placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent transition-colors",
        className,
      )}
      {...props}
    />
  )
})
