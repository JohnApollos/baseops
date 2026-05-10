import { DeliveryVolumeChart, StatusDistributionPie, FleetPerformanceBar } from "@/components/owner/overview-charts";
import { Package, TrendingUp, Truck } from "lucide-react";

export default function OwnerDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization Overview</h1>
        <p className="text-muted-foreground">High-level metrics and performance analytics.</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span className="text-sm font-medium">Total Volume (30d)</span>
          </div>
          <p className="text-3xl font-bold">4,289</p>
          <p className="text-xs text-success flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +12% from last month
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">Success Rate</span>
          </div>
          <p className="text-3xl font-bold">98.2%</p>
          <p className="text-xs text-success flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +0.5% from last month
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Truck className="h-4 w-4" />
            <span className="text-sm font-medium">Active Fleet</span>
          </div>
          <p className="text-3xl font-bold">12 / 15</p>
          <p className="text-xs text-muted-foreground">Vehicles on route today</p>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DeliveryVolumeChart />
        <StatusDistributionPie />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FleetPerformanceBar />
      </div>
    </div>
  );
}
