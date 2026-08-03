"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassSurface } from "@/components/ui/GlassSurface";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

const sizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  size = "md",
  children,
  footer,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <GlassSurface
        tone="strong"
        className={cn(
          "w-full rounded-xl max-h-[85vh] overflow-y-auto flex flex-col animate-scale-in",
          sizes[size],
          className,
        )}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <h3 className="text-base font-bold text-ink">{title}</h3>
            <button
              onClick={onClose}
              data-close-modal
              aria-label="Fechar"
              className="p-1.5 -m-1 rounded-md hover:bg-cream text-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-line shrink-0">{footer}</div>}
      </GlassSurface>
    </div>
  );
}
