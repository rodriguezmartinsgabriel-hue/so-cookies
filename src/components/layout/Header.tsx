"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, User, LogOut, AlertTriangle, Package, Truck, Check, X } from "lucide-react";
import { useNotifications, type Notification } from "@/lib/notifications";
import { useRouter } from "next/navigation";

type User = {
  name?: string | null;
  email?: string | null;
  role?: string;
};

function NotifIcon({ type }: { type: Notification["type"] }) {
  switch (type) {
    case "low_stock":
      return <AlertTriangle className="w-4 h-4 text-warning" />;
    case "pending_order":
      return <Package className="w-4 h-4 text-info" />;
    case "ready_order":
      return <Truck className="w-4 h-4 text-success" />;
    default:
      return <Check className="w-4 h-4 text-muted" />;
  }
}

export function Header({
  user,
  onLogout,
}: {
  user?: User;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleNotifClick(n: Notification) {
    markAsRead(n.id);
    setOpen(false);
    if (n.href) router.push(n.href);
  }

  return (
    <header className="h-14 border-b border-line bg-paper flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="lg:hidden">
        <img
          src="/só logo sem fundo.svg"
          alt="Só Cookies & Café"
          className="h-8 w-auto"
        />
      </div>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="relative p-2 rounded-lg hover:bg-cream text-muted transition-colors"
            aria-label="Notificações"
          >
            <Bell className="w-5 h-5" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center bg-danger text-paper text-[10px] font-bold rounded-full px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] bg-paper border border-line rounded-xl shadow-lg z-50 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                <h3 className="text-sm font-bold text-ink">Notificações</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[10px] text-info hover:text-info/80 transition-colors">
                      Marcar tudo lido
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-cream text-muted">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-8 h-8 text-kraft mx-auto mb-2" strokeWidth={1} />
                    <p className="text-xs text-muted">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-cream/50 transition-colors border-b border-line last:border-0 ${
                        !n.read ? "bg-info/5" : ""
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        <NotifIcon type={n.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${!n.read ? "font-semibold text-ink" : "text-muted"}`}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-muted truncate">{n.message}</p>
                      </div>
                      {!n.read && (
                        <span className="w-2 h-2 bg-info rounded-full mt-1 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-3 border-l border-line">
          <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center">
            <User className="w-4 h-4 text-paper" strokeWidth={1.5} />
          </div>
          <span className="hidden sm:block text-sm font-medium text-ink">
            {user?.name || "Usuário"}
          </span>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-md hover:bg-cream text-muted transition-colors ml-1"
            title="Sair"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
