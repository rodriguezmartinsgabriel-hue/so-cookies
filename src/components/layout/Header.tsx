"use client";

import { Bell, User } from "lucide-react";

export function Header() {
  return (
    <header className="h-14 border-b border-line bg-paper flex items-center justify-between px-4 lg:px-6">
      <div className="lg:hidden">
        <span className="font-brand text-xl text-ink">só</span>
      </div>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <button
          className="relative p-2 rounded-lg hover:bg-cream text-muted transition-colors"
          aria-label="Notificações"
        >
          <Bell className="w-5 h-5" strokeWidth={1.5} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-line">
          <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center">
            <User className="w-4 h-4 text-paper" strokeWidth={1.5} />
          </div>
          <span className="hidden sm:block text-sm font-medium text-ink">
            Admin
          </span>
        </div>
      </div>
    </header>
  );
}
