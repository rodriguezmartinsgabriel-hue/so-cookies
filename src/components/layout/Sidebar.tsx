"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  ShoppingBag,
  Package,
  FileText,
  Wallet,
  Truck,
  Factory,
  BarChart3,
  BookOpen,
  Store,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Painel", icon: Home },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/vendas", label: "Vendas", icon: Wallet },
  { href: "/estoque", label: "Insumos", icon: Package },
  { href: "/receitas", label: "Receitas", icon: FileText },
  { href: "/canais", label: "Canais", icon: Store },
  { href: "/caixa", label: "Caixa", icon: Wallet },
  { href: "/delivery", label: "Delivery", icon: Truck },
  { href: "/producao", label: "Produção", icon: Factory },
  { href: "/documentos", label: "Documentos", icon: BookOpen },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden lg:flex flex-col border-r border-line bg-cream transition-all duration-200 ${
        collapsed ? "w-[68px]" : "w-56"
      }`}
    >
      <div className="flex items-center justify-between h-14 px-3 border-b border-line">
        {!collapsed && (
          <Link href="/" className="font-brand text-2xl text-ink leading-none">
            só
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-kraft/50 text-muted transition-colors"
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-ink text-paper"
                  : "text-muted hover:bg-kraft/40 hover:text-ink"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="p-3 border-t border-line">
          <p className="text-xs text-muted text-center">Só Cookies v0.1</p>
        </div>
      )}
    </aside>
  );
}
