import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full h-10 px-3 border border-line rounded-lg bg-paper/70 text-base text-ink placeholder:text-kraft focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 transition-colors backdrop-blur-sm",
          className,
        )}
        {...props}
      />
    );
  },
);
