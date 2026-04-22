export default function DispatchDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dispatch Center</h1>
        <p className="text-muted-foreground">
          Real-time parcel board, route planning, and driver assignment.
        </p>
      </div>

      {/* Placeholder — Phase 3 will populate this */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Today", value: "—", color: "text-foreground" },
          { label: "In Transit", value: "—", color: "text-info" },
          { label: "Delivered", value: "—", color: "text-success" },
          { label: "Failed", value: "—", color: "text-destructive" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border bg-card p-4 space-y-1"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold font-code ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p>Parcel board and Leaflet map will be built in Phase 3.</p>
      </div>
    </div>
  );
}
