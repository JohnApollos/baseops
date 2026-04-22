"use client";

import { Badge } from "@/components/ui/badge";
import type { ParcelStatus } from "@/types";

// ============================================================
// Parcel Status Badge — color-coded badge for parcel lifecycle.
// Used across the dispatcher board, parcel tables, and driver cards.
// ============================================================

const statusConfig: Record<
  ParcelStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  received: {
    label: "Received",
    variant: "outline",
    className: "border-muted-foreground/30 text-muted-foreground",
  },
  assigned: {
    label: "Assigned",
    variant: "secondary",
    className: "bg-info/20 text-info border-info/30",
  },
  in_transit: {
    label: "In Transit",
    variant: "secondary",
    className: "bg-warning/20 text-warning border-warning/30",
  },
  delivered: {
    label: "Delivered",
    variant: "secondary",
    className: "bg-success/20 text-success border-success/30",
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    className: "bg-destructive/20 text-destructive border-destructive/30",
  },
  returned: {
    label: "Returned",
    variant: "outline",
    className: "border-muted-foreground/30 text-muted-foreground",
  },
};

interface ParcelStatusBadgeProps {
  status: ParcelStatus;
  className?: string;
}

export function ParcelStatusBadge({ status, className }: ParcelStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.received;
  return (
    <Badge variant={config.variant} className={`${config.className} ${className || ""}`}>
      {config.label}
    </Badge>
  );
}
