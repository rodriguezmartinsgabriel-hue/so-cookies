"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import { Home, ShoppingBag, Package, DollarSign, Truck, BarChart3, Users } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/delivery", label: "Delivery", icon: Truck },
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
      <div className="flex items-center justify-between h-16 px-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-center w-12 h-12 -mt-5 rounded-full bg-ink text-paper shadow-lg transition-transform active:scale-95"
                aria-label="Nova Venda"
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 w-12 py-1 rounded-lg transition-colors ${
                isActive ? "text-ink" : "text-muted"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
