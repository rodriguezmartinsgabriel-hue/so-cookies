"use client";

import { useSyncExternalStore, type CSSProperties, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlassSurfaceProps = {
  as?: ElementType;
  variant?: "glass" | "solid";
  tone?: "default" | "strong";
  className?: string;
  children?: ReactNode;
} & Record<string, unknown>;

const emptySubscribe = () => () => {};

function supportsAppleVisualEffect(): boolean {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false;
  return CSS.supports("-apple-visual-effect", "auto");
}

export function GlassSurface({
  as: Tag = "div",
  variant = "glass",
  tone = "default",
  className,
  children,
  ...props
}: GlassSurfaceProps) {
  const appleEffect = useSyncExternalStore(
    emptySubscribe,
    () => supportsAppleVisualEffect(),
    () => false,
  );

  const style: CSSProperties =
    appleEffect && variant === "glass"
      ? {
          backgroundColor: "transparent",
          ["-apple-visual-effect" as string]: "auto",
        }
      : variant === "glass"
        ? {
            backgroundColor: tone === "strong" ? "var(--glass-tint-strong)" : "var(--glass-tint)",
            backgroundImage: "var(--glass-highlight)",
            backdropFilter: "blur(var(--glass-blur)) saturate(1.8)",
            WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(1.8)",
          }
        : {
            backgroundColor: "var(--paper)",
          };

  return (
    <Tag
      className={cn("glass-surface", className)}
      style={style}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </Tag>
  );
}
