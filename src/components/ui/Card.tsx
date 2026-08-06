import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { GlassSurface } from "@/components/ui/GlassSurface";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "glass" | "solid";
  padded?: boolean;
  interactive?: boolean;
};

export function Card({
  variant = "glass",
  padded = true,
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <GlassSurface
      variant={variant}
      tone="strong"
      className={cn(
        "rounded-xl",
        padded && "p-4",
        interactive && "transition-shadow duration-200 hover:shadow-lg active:scale-[0.99]",
        className,
      )}
      {...props}
    >
      {children}
    </GlassSurface>
  );
}
