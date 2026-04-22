"use client";

import dynamic from "next/dynamic";

// ============================================================
// Dispatch Map — Leaflet map showing driver pins.
// Dynamically imported with SSR disabled since Leaflet requires
// the browser's `window` object.
// ============================================================

// Lazy-load the actual map to avoid SSR issues with Leaflet
const MapInner = dynamic(() => import("./map-inner"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] rounded-xl border bg-card flex items-center justify-center">
      <div className="text-sm text-muted-foreground animate-pulse">
        Loading map…
      </div>
    </div>
  ),
});

export interface DriverPin {
  id: string;
  name: string;
  coords: [number, number];
  status: "active" | "idle";
  parcelsCount: number;
}

interface DispatchMapProps {
  drivers: DriverPin[];
}

export function DispatchMap({ drivers }: DispatchMapProps) {
  return <MapInner drivers={drivers} />;
}
