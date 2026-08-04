"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const MotionGlassSurface = motion.create(GlassSurface);

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
  const haptic = useHapticFeedback();
  const dialogRef = useFocusTrap(open);
  const reducedMotion = useReducedMotion();

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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
        >
           <MotionGlassSurface
              ref={dialogRef}
              tone="strong"
              className={cn(
                "w-full rounded-xl max-h-[85vh] overflow-y-auto flex flex-col",
               sizes[size],
               className,
             )}
             onClick={(e: React.MouseEvent) => e.stopPropagation()}
             initial={reducedMotion ? {} : { scale: 0.96, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             exit={reducedMotion ? {} : { scale: 0.96, opacity: 0 }}
             transition={{ type: "spring", stiffness: reducedMotion ? 1 : 300, damping: reducedMotion ? 1 : 28 }}
          >
            {title && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
                <h3 className="text-base font-bold text-ink">{title}</h3>
                <button
                  onClick={() => { haptic.tap(); onClose() }}
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
          </MotionGlassSurface>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
