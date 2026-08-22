"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

// Baseline fallback trends when no operational records exist
const defaultVolumeData = [
  { date: "Mon", parcels: 0 },
  { date: "Tue", parcels: 0 },
  { date: "Wed", parcels: 0 },
  { date: "Thu", parcels: 0 },
  { date: "Fri", parcels: 0 },
  { date: "Sat", parcels: 0 },
  { date: "Sun", parcels: 0 },
];

const defaultStatusData = [
  { name: "Delivered", value: 0, color: "var(--color-success)" },
  { name: "In Transit", value: 0, color: "var(--color-warning)" },
  { name: "Assigned", value: 0, color: "var(--color-info)" },
  { name: "Failed", value: 0, color: "var(--color-destructive)" },
];

const defaultFleetData = [
  { name: "No Active Vehicles", deliveries: 0 },
];

export function DeliveryVolumeChart() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState(defaultVolumeData);

  useEffect(() => {
    setMounted(true);
    async function loadVolume() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("org_id")
          .eq("id", user.id)
          .single();

        if (!profile?.org_id) return;

        const { data: parcels } = await supabase
          .from("parcels")
          .select("created_at")
          .eq("org_id", profile.org_id);

        if (parcels && parcels.length > 0) {
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const counts: Record<string, number> = {
            Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0,
          };

          parcels.forEach((p) => {
            const d = new Date(p.created_at);
            const dayName = days[d.getDay()];
            if (counts[dayName] !== undefined) {
              counts[dayName]++;
            }
          });

          const volumeArray = [
            { date: "Mon", parcels: counts.Mon },
            { date: "Tue", parcels: counts.Tue },
            { date: "Wed", parcels: counts.Wed },
            { date: "Thu", parcels: counts.Thu },
            { date: "Fri", parcels: counts.Fri },
            { date: "Sat", parcels: counts.Sat },
            { date: "Sun", parcels: counts.Sun },
          ];

          setData(volumeArray);
        }
      } catch (err) {
        console.warn("Failed to query live volume chart data:", err);
      }
    }
    loadVolume();
  }, []);

  return (
    <Card className="col-span-1 lg:col-span-2 bg-card">
      <CardHeader>
        <CardTitle>Delivery Volume</CardTitle>
        <CardDescription>Parcels processed across the weekly cycle.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full flex items-center justify-center">
          {!mounted ? (
            <div className="h-full w-full bg-muted/10 animate-pulse rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorParcels" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px" }}
                  itemStyle={{ color: "var(--color-foreground)" }}
                />
                <Area type="monotone" dataKey="parcels" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorParcels)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusDistributionPie() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState(defaultStatusData);

  useEffect(() => {
    setMounted(true);
    async function loadStatuses() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("org_id")
          .eq("id", user.id)
          .single();

        if (!profile?.org_id) return;

        const { data: parcels } = await supabase
          .from("parcels")
          .select("status")
          .eq("org_id", profile.org_id);

        if (parcels && parcels.length > 0) {
          const delivered = parcels.filter((p) => p.status === "delivered").length;
          const inTransit = parcels.filter((p) => p.status === "in_transit").length;
          const assigned = parcels.filter((p) => p.status === "assigned").length;
          const failed = parcels.filter((p) => p.status === "failed").length;

          setData([
            { name: "Delivered", value: delivered, color: "var(--color-success)" },
            { name: "In Transit", value: inTransit, color: "var(--color-warning)" },
            { name: "Assigned", value: assigned, color: "var(--color-info)" },
            { name: "Failed", value: failed, color: "var(--color-destructive)" },
          ]);
        }
      } catch (err) {
        console.warn("Failed to query live parcel status distribution:", err);
      }
    }
    loadStatuses();
  }, []);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Status Breakdown</CardTitle>
        <CardDescription>Current distribution of organization parcels.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full flex items-center justify-center">
          {!mounted ? (
            <div className="w-[180px] h-[180px] rounded-full border border-dashed border-muted/30 animate-spin" />
          ) : total === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-muted flex items-center justify-center mb-2">
                0
              </div>
              <span>No parcels registered yet</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px" }}
                  itemStyle={{ color: "var(--color-foreground)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}: {item.value}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function FleetPerformanceBar() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState(defaultFleetData);

  useEffect(() => {
    setMounted(true);
    async function loadFleetPerformance() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("org_id")
          .eq("id", user.id)
          .single();

        if (!profile?.org_id) return;

        const { data: vehicles } = await supabase
          .from("vehicles")
          .select("id, registration_plate, type")
          .eq("org_id", profile.org_id);

        const { data: parcels } = await supabase
          .from("parcels")
          .select("assigned_vehicle_id, status")
          .eq("org_id", profile.org_id);

        if (vehicles && vehicles.length > 0) {
          const fleetStats = vehicles.map((v) => {
            const count = (parcels || []).filter(
              (p) => p.assigned_vehicle_id === v.id
            ).length;
            return {
              name: `${v.registration_plate} (${v.type})`,
              deliveries: count,
            };
          });
          setData(fleetStats);
        }
      } catch (err) {
        console.warn("Failed to query live fleet performance:", err);
      }
    }
    loadFleetPerformance();
  }, []);

  return (
    <Card className="col-span-1 lg:col-span-3 bg-card">
      <CardHeader>
        <CardTitle>Fleet Performance</CardTitle>
        <CardDescription>Parcels currently assigned or handled per vehicle.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full flex items-center justify-center">
          {!mounted ? (
            <div className="h-full w-full bg-muted/10 animate-pulse rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.2 }}
                  contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px" }}
                  itemStyle={{ color: "var(--color-foreground)" }}
                />
                <Bar dataKey="deliveries" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
