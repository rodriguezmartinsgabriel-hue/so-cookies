"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Image from "next/image"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { onDataRefresh } from "@/lib/refresh-events"
import { useRole } from "@/hooks/useRole"
import { useQueryData } from "@/hooks/useQueryData"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { Card } from "@/components/ui/Card"
import {
  ShoppingBag,
  Package,
  FileText,
  DollarSign,
  Factory,
  BarChart3,
  Truck,
  ClipboardList,
  Store,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  BookUser,
} from "lucide-react"
import Link from "next/link"
import type { Ingredient } from "@/lib/entity-types"

const modules = [
  { label: "Pedidos", icon: ShoppingBag, href: "/pedidos", color: "bg-info/10 text-info", desc: "Gerenciar pedidos" },
  {
    label: "Contatos",
    icon: BookUser,
    href: "/contatos",
    color: "bg-info/10 text-info",
    desc: "Clientes e fornecedores",
  },
  {
    label: "Vendas",
    icon: DollarSign,
    href: "/vendas",
    color: "bg-success/10 text-success",
    desc: "Controle de vendas",
  },
  {
    label: "Receitas",
    icon: FileText,
    href: "/receitas",
    color: "bg-warning/10 text-warning",
    desc: "Fichas técnicas",
  },
  {
    label: "Insumos",
    icon: Package,
    href: "/estoque",
    color: "bg-danger/10 text-danger",
    desc: "Estoque e fornecedores",
  },
  { label: "Produção", icon: Factory, href: "/producao", color: "bg-ink/10 text-ink", desc: "Lotes e perdas" },
  { label: "Caixa", icon: DollarSign, href: "/caixa", color: "bg-success/10 text-success", desc: "Fluxo de caixa" },
  { label: "Delivery", icon: Truck, href: "/delivery", color: "bg-info/10 text-info", desc: "Entregas" },
  {
    label: "Rotas",
    icon: Truck,
    href: "/rotas",
    color: "bg-info/10 text-info",
    desc: "Rotas de entrega",
    adminOnly: true,
  },
  { label: "Relatórios", icon: BarChart3, href: "/relatorios", color: "bg-muted/10 text-muted", desc: "Análises" },
  {
    label: "Indicadores",
    icon: ClipboardList,
    href: "/indicadores",
    color: "bg-warning/10 text-warning",
    desc: "Indicadores do negócio",
  },
  { label: "Canais", icon: Store, href: "/canais", color: "bg-info/10 text-info", desc: "Canais de venda" },
  {
    label: "Usuários",
    icon: Users,
    href: "/usuarios",
    color: "bg-muted/10 text-muted",
    desc: "Acesso e permissões",
    adminOnly: true,
  },
]

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${url}`)
  return resp.json()
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const { isAdmin } = useRole()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: orders, isLoading: ordersLoading } = useQueryData("orders")

  const kpisQuery = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: () => fetchJson("/api/dashboard/kpis"),
    staleTime: 30_000,
  })

  const lowStockQuery = useQuery({
    queryKey: ["low-stock"],
    queryFn: () => fetchJson("/api/ingredients/low-stock"),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    return onDataRefresh(() => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] })
      queryClient.invalidateQueries({ queryKey: ["low-stock"] })
    })
  }, [status, queryClient])

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex items-center gap-4">
          <Image src="/logo.svg" alt="Só" width={40} height={40} unoptimized className="h-10 w-auto" />
          <Skeleton className="h-4 w-24 mx-auto mt-2" />
        </div>
      </div>
    )
  }

  const kpis = kpisQuery.data as Record<string, number> | undefined
  const lowStock = (lowStockQuery.data ?? []) as Ingredient[]
  const recentOrders = orders.slice(0, 5)
  const loading = ordersLoading || kpisQuery.isLoading

  const tomorrowKey = (() => {
    const t = new Date()
    t.setDate(t.getDate() + 1)
    return t.toLocaleDateString("pt-BR")
  })()
  const tomorrowDeliveries = orders.filter(
    (o) =>
      o.deliveryDate &&
      !o.pickupCode &&
      o.status !== "CANCELADO" &&
      o.status !== "CONCLUIDO" &&
      new Date(o.deliveryDate).toLocaleDateString("pt-BR") === tomorrowKey,
  )

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Olá, {session?.user?.name || "Usuário"} <span aria-hidden="true">👋</span>
          </h1>
          <p className="text-sm text-muted mt-1">Painel de gestão — Só Cookies & Café</p>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-7 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </Card>
              ))}
            </div>
            <div>
              <Skeleton className="h-4 w-20 mb-3" />
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Card key={i} className="p-5">
                    <Skeleton className="h-12 w-12 rounded-xl mb-3" />
                    <Skeleton className="h-4 w-16 mx-auto mb-1" />
                    <Skeleton className="h-3 w-20 mx-auto" />
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted uppercase tracking-wide">Faturamento</span>
                  <TrendingUp className="w-4 h-4 text-success" strokeWidth={1.5} />
                </div>
                <p className="text-2xl font-bold text-ink">R$ {kpis?.revenue?.toFixed(0) || "0"}</p>
                <p className="text-xs text-muted mt-1">mês atual</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted uppercase tracking-wide">Lucro</span>
                  <TrendingUp className="w-4 h-4 text-success" strokeWidth={1.5} />
                </div>
                <p className="text-2xl font-bold text-success">R$ {kpis?.profit?.toFixed(0) || "0"}</p>
                <p className="text-xs text-muted mt-1">margem {kpis?.margin?.toFixed(1) || 0}%</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted uppercase tracking-wide">Pedidos Hoje</span>
                  <ShoppingBag className="w-4 h-4 text-info" strokeWidth={1.5} />
                </div>
                <p className="text-2xl font-bold text-ink">{kpis?.ordersToday || 0}</p>
                <p className="text-xs text-warning mt-1">{kpis?.pendingOrders || 0} pendentes</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted uppercase tracking-wide">Saldo Hoje</span>
                  <DollarSign className="w-4 h-4 text-muted" strokeWidth={1.5} />
                </div>
                <p className={`text-2xl font-bold ${(kpis?.todayBalance || 0) >= 0 ? "text-success" : "text-danger"}`}>
                  R$ {kpis?.todayBalance?.toFixed(0) || "0"}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-success flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3" />
                    {kpis?.todayIn || 0}
                  </span>
                  <span className="text-danger flex items-center gap-0.5">
                    <ArrowDownLeft className="w-3 h-3" />
                    {kpis?.todayOut || 0}
                  </span>
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-info" strokeWidth={1.5} />
                  <span className="text-xs font-medium text-muted uppercase tracking-wide">
                    Receita Delivery (marketplaces)
                  </span>
                </div>
                <div className="flex items-center gap-5">
                  <div>
                    <p className="text-lg font-bold text-ink">R$ {kpis?.deliveryRevenue?.toFixed(0) || "0"}</p>
                    <p className="text-[10px] text-muted">líquida de taxas · mês atual</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-danger">R$ {kpis?.deliveryFees?.toFixed(0) || "0"}</p>
                    <p className="text-[10px] text-muted">em taxas</p>
                  </div>
                </div>
              </div>
            </Card>

            <div>
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">Módulos</h2>
              <div className="grid grid-cols-3 lg:grid-cols-3 gap-3 stagger">
                {modules
                  .filter((mod) => !mod.adminOnly || isAdmin)
                  .map((mod, index) => (
                    <Link key={mod.label} href={mod.href} className="block" style={{ ["--stagger" as string]: index }}>
                      <Card interactive padded={false} className="group flex flex-col items-center gap-3 p-5 h-full">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${mod.color} group-hover:scale-110 transition-transform`}
                        >
                          <mod.icon className="w-6 h-6" strokeWidth={1.5} />
                        </div>
                        <div className="text-center">
                          <span className="text-sm font-semibold text-ink block">{mod.label}</span>
                          <span className="text-[10px] text-muted">{mod.desc}</span>
                        </div>
                      </Card>
                    </Link>
                  ))}
              </div>
            </div>

            {lowStock.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Estoque Baixo
                </h2>
                <Card padded={false} className="divide-y divide-line overflow-hidden">
                  {lowStock.slice(0, 5).map((item: Ingredient) => (
                    <div key={item.id} className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink">{item.name}</p>
                        <p className="text-xs text-muted">{item.supplier}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-danger">{item.stockKg} kg</p>
                        <p className="text-xs text-muted">mín: {item.minStockKg} kg</p>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {tomorrowDeliveries.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-info" />
                  Entregas de amanhã ({tomorrowDeliveries.length})
                </h2>
                <Card padded={false} className="divide-y divide-line overflow-hidden">
                  {tomorrowDeliveries.map((order) => (
                    <div key={order.id} className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">
                          {order.customer} — {order.channel}
                        </p>
                        <p className="text-xs text-muted">
                          {(order.items || []).length} itens · R$ {order.total}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-ink">R$ {order.total}</p>
                        <p className="text-xs text-muted">{order.status?.toLowerCase()}</p>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {recentOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">Pedidos Recentes</h2>
                <Card padded={false} className="divide-y divide-line overflow-hidden">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">
                          {order.customer} — {order.channel}
                        </p>
                        <p className="text-xs text-muted">{(order.items || []).length} itens</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-ink">R$ {order.total}</p>
                        <p className="text-xs text-muted">{order.status?.toLowerCase()}</p>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
