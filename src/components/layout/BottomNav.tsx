"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import { Home, ShoppingBag, Package, DollarSign, Factory, BarChart3, BookOpen, Users } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/vendas", label: "Vendas", icon: DollarSign, isCenter: true },
  { href: "/estoque", label: "Insumos", icon: Package },
  { href: "/relatorios", label: "Relat.", icon: BarChart3 },
  { href: "/usuarios", label: "Usuários", icon: Users, adminOnly: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useRole();
  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-paper border-t border-line">
      <div className="flex items-center justify-around h-16 px-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-center w-14 h-14 -mt-5 rounded-full bg-ink text-paper shadow-lg transition-transform active:scale-95"
                aria-label="Nova Venda"
              >
                <Icon className="w-6 h-6" strokeWidth={1.5} />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 w-14 py-1 rounded-lg transition-colors ${
                isActive ? "text-ink" : "text-muted"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
