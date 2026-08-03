"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, DollarSign, Package, BarChart3 } from "lucide-react";
import { GlassSurface } from "@/components/ui/GlassSurface";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/vendas", label: "Vendas", icon: DollarSign, isCenter: true },
  { href: "/estoque", label: "Insumos", icon: Package },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pointer-events-none">
      <GlassSurface tone="strong" className="max-w-md mx-auto rounded-2xl flex items-center justify-between h-16 px-1 pointer-events-auto animate-fade-in-up">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-center w-14 h-14 -mt-5 rounded-full bg-ink text-paper shadow-lg transition-transform active:scale-95"
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="w-6 h-6" strokeWidth={1.5} />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-lg transition-colors ${
                isActive ? "text-ink" : "text-muted"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </GlassSurface>
    </nav>
  );
}
