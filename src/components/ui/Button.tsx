import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
};

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none";

const variants = {
  primary: "bg-ink text-paper hover:bg-ink/90",
  secondary: "bg-paper/70 border border-line text-ink hover:bg-cream backdrop-blur-sm",
  ghost: "text-muted hover:bg-cream hover:text-ink",
  danger: "bg-danger text-paper hover:bg-danger/90",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", children, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.button>
  );
});