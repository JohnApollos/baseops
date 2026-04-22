"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DriverPin } from "./dispatch-map";

// ============================================================
// Map Inner — the actual Leaflet map (client-only).
// Shows driver location pins on a tile map centered on Nairobi.
// ============================================================

// Custom marker icons
const activeIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#f59e0b;border:2px solid #fff;box-shadow:0 0 8px rgba(245,158,11,0.6);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const idleIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:12px;height:12px;border-radius:50%;background:#6b7280;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

interface MapInnerProps {
  drivers: DriverPin[];
}

export default function MapInner({ drivers }: MapInnerProps) {
  // Center on Nairobi by default
  const center: [number, number] = [-1.2921, 36.8219];

  return (
    <div className="h-[400px] rounded-xl border overflow-hidden">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ background: "#1a1a2e" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {drivers.map((driver) => (
          <Marker
            key={driver.id}
            position={driver.coords}
            icon={driver.status === "active" ? activeIcon : idleIcon}
          >
            <Popup>
              <div className="text-sm space-y-1">
                <p className="font-semibold">{driver.name}</p>
                <p className="text-muted-foreground">
                  {driver.parcelsCount} parcel{driver.parcelsCount !== 1 && "s"} ·{" "}
                  <span
                    className={
                      driver.status === "active"
                        ? "text-amber-500"
                        : "text-gray-400"
                    }
                  >
                    {driver.status}
                  </span>
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
