"use client";

import { ParcelStatusBadge } from "@/components/dispatch/parcel-status-badge";
import type { Parcel, ParcelStatus } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============================================================
// Parcel Kanban Board — visual status columns for dispatchers.
// Parcels are grouped by status into draggable columns.
// This is the hero component of the dispatcher dashboard.
// ============================================================

const KANBAN_COLUMNS: { status: ParcelStatus; label: string; accent: string }[] = [
  { status: "received", label: "Received", accent: "border-t-muted-foreground/40" },
  { status: "assigned", label: "Assigned", accent: "border-t-info" },
  { status: "in_transit", label: "In Transit", accent: "border-t-warning" },
  { status: "delivered", label: "Delivered", accent: "border-t-success" },
  { status: "failed", label: "Failed", accent: "border-t-destructive" },
];

interface ParcelBoardProps {
  parcels: Parcel[];
}

export function ParcelBoard({ parcels }: ParcelBoardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {KANBAN_COLUMNS.map((col) => {
        const columnParcels = parcels.filter((p) => p.status === col.status);
        return (
          <div
            key={col.status}
            className={`rounded-xl border border-t-4 ${col.accent} bg-card`}
          >
            {/* Column header */}
            <div className="px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="text-xs text-muted-foreground font-code">
                {columnParcels.length}
              </span>
            </div>

            {/* Cards */}
            <ScrollArea className="h-[400px]">
              <div className="px-3 pb-3 space-y-2">
                {columnParcels.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground/50">
                    No parcels
                  </div>
                ) : (
                  columnParcels.map((parcel) => (
                    <div
                      key={parcel.id}
                      className="rounded-lg border bg-background p-3 space-y-2 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                    >
                      {/* Tracking code */}
                      <div className="flex items-center justify-between">
                        <span className="font-code text-xs text-primary">
                          {parcel.tracking_code}
                        </span>
                        <ParcelStatusBadge status={parcel.status} />
                      </div>

                      {/* Recipient */}
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium truncate">
                          {parcel.recipient_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {parcel.recipient_address}
                        </p>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{parcel.weight_kg} kg</span>
                        {parcel.assigned_driver_id && (
                          <span className="font-code">Driver assigned</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
