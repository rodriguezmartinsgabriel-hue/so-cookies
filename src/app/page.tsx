import { AppShell } from "@/components/layout/AppShell";
import { TodaySummary } from "@/components/dashboard/TodaySummary";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { LowStock } from "@/components/dashboard/LowStock";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-brand text-3xl text-ink">bom dia, time</h1>
          <p className="text-muted text-sm mt-1">
            Aqui está o resumo do seu negócio hoje.
          </p>
        </div>

        <TodaySummary />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity />
          <LowStock />
        </div>

        <QuickActions />
      </div>
    </AppShell>
  );
}
