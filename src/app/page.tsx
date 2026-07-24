import { AppShell } from "@/components/layout/AppShell";
import { TodaySummary } from "@/components/dashboard/TodaySummary";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { LowStock } from "@/components/dashboard/LowStock";
import { getDashboardKpis, getOrders, getLowStock as getLowStockDb } from "@/lib/db";

export default async function DashboardPage() {
  const [kpis, orders, lowStockItems] = await Promise.all([
    getDashboardKpis(),
    getOrders(),
    getLowStockDb(),
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-brand text-3xl text-ink">bom dia, time</h1>
          <p className="text-muted text-sm mt-1">
            Aqui está o resumo do seu negócio hoje.
          </p>
        </div>

        <TodaySummary kpis={kpis} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity orders={orders} />
          <LowStock items={lowStockItems} />
        </div>

        <QuickActions />
      </div>
    </AppShell>
  );
}
