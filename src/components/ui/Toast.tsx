"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { GlassSurface } from "@/components/ui/GlassSurface";

type ToastVariant = "success" | "danger" | "info";

type ToastItem = {
  id: number;
  variant: ToastVariant;
  title: string;
  message?: string;
};

type ToastContextValue = {
  toast: (variant: ToastVariant, title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((variant: ToastVariant, title: string, message?: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, variant, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-16 right-4 z-[60] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <ToastCard
            key={t.id}
            item={t}
            onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const icons: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-success" />,
  danger: <AlertTriangle className="w-5 h-5 text-danger" />,
  info: <Info className="w-5 h-5 text-info" />,
};

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  return (
    <GlassSurface tone="strong" className="rounded-xl p-3 flex items-start gap-3 shadow-lg animate-toast-in">
      <div className="mt-0.5 shrink-0">{icons[item.variant]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">{item.title}</p>
        {item.message && <p className="text-xs text-muted mt-0.5">{item.message}</p>}
      </div>
      <button
        onClick={onClose}
        className="p-1 -m-1 rounded-md hover:bg-cream text-muted"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>
    </GlassSurface>
  );
}
