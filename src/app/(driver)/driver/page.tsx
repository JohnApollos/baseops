export default function DriverDashboardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Today&apos;s Deliveries</h1>
        <p className="text-sm text-muted-foreground">
          Tap a parcel to update its status.
        </p>
      </div>

      {/* Placeholder delivery cards — Phase 4 will replace these */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg border bg-card p-4 space-y-3 animate-slide-in"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center justify-between">
            <span className="font-code text-sm text-primary">
              BOP-2025-0000{i}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              In Transit
            </span>
          </div>
          <div className="text-sm">
            <p className="font-medium">Recipient Name</p>
            <p className="text-muted-foreground">123 Delivery Address, City</p>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 text-xs px-3 py-2 rounded-md bg-success/20 text-success font-medium hover:bg-success/30 transition-colors">
              ✓ Delivered
            </button>
            <button className="flex-1 text-xs px-3 py-2 rounded-md bg-destructive/20 text-destructive font-medium hover:bg-destructive/30 transition-colors">
              ✗ Failed
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
