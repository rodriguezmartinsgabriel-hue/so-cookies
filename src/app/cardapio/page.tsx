"use client";

import { AppShell } from "@/components/layout/AppShell";
import { products } from "@/lib/mock-data";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import { useState } from "react";

const categoryIcons: Record<string, string> = {
  Cookie: "🍪",
  Brownie: "🍫",
  Café: "☕",
  Bebida: "🥤",
};

export default function CardapioPage() {
  const [cart, setCart] = useState<
    { id: string; name: string; price: number; qty: number }[]
  >([]);

  const addToCart = (product: (typeof products)[0]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          qty: 1,
        },
      ];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing && existing.qty > 1) {
        return prev.map((item) =>
          item.id === id ? { ...item, qty: item.qty - 1 } : item
        );
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const grouped = products
    .filter((p) => p.active)
    .reduce(
      (acc, p) => {
        if (!acc[p.category]) acc[p.category] = [];
        acc[p.category].push(p);
        return acc;
      },
      {} as Record<string, (typeof products)[0][]>
    );

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="font-brand text-4xl text-ink">cardápio</h1>
          <p className="text-sm text-muted mt-1">Só Cookies & Café</p>
        </div>

        {Object.entries(grouped).map(([category, items]) => (
          <section key={category}>
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3 flex items-center gap-2">
              <span>{categoryIcons[category]}</span>
              {category}
            </h2>
            <div className="space-y-2">
              {items.map((product) => {
                const cartItem = cart.find((c) => c.id === product.id);
                return (
                  <div
                    key={product.id}
                    className="border border-line rounded-lg bg-paper p-3 shadow-card flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink">
                        {product.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-ink">
                        R$ {product.price.toFixed(2)}
                      </span>
                      {cartItem ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="w-7 h-7 rounded-full border border-line flex items-center justify-center text-ink hover:bg-cream"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-semibold text-ink w-4 text-center">
                            {cartItem.qty}
                          </span>
                          <button
                            onClick={() => addToCart(product)}
                            className="w-7 h-7 rounded-full bg-ink text-paper flex items-center justify-center hover:bg-ink/90"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="w-7 h-7 rounded-full bg-ink text-paper flex items-center justify-center hover:bg-ink/90"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {cart.length > 0 && (
          <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-80 bg-ink text-paper rounded-xl p-4 shadow-lg z-40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">
                <ShoppingCart className="w-4 h-4 inline mr-1" />
                {cart.reduce((s, i) => s + i.qty, 0)} itens
              </span>
              <span className="text-lg font-bold">R$ {total.toFixed(2)}</span>
            </div>
            <div className="text-xs text-paper/70 space-y-0.5">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>
                    {item.qty}x {item.name}
                  </span>
                  <span>R$ {(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <button className="mt-3 w-full h-10 bg-paper text-ink rounded-lg text-sm font-semibold hover:bg-paper/90 transition-colors">
              Finalizar Pedido
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
