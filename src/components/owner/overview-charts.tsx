"use client";

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

// Mock data (in production, fetch via Supabase)
const volumeData = [
  { date: "Mon", parcels: 120 },
  { date: "Tue", parcels: 150 },
  { date: "Wed", parcels: 180 },
  { date: "Thu", parcels: 140 },
  { date: "Fri", parcels: 210 },
  { date: "Sat", parcels: 90 },
  { date: "Sun", parcels: 60 },
];

const statusData = [
  { name: "Delivered", value: 65, color: "var(--color-success)" },
  { name: "In Transit", value: 25, color: "var(--color-warning)" },
  { name: "Failed", value: 5, color: "var(--color-destructive)" },
  { name: "Assigned", value: 5, color: "var(--color-info)" },
];

const fleetData = [
  { name: "Van A (KCA 123)", deliveries: 45 },
  { name: "Van B (KCB 456)", deliveries: 32 },
  { name: "Moto 1 (KMCA 12)", deliveries: 56 },
  { name: "Moto 2 (KMCB 34)", deliveries: 48 },
];

export function DeliveryVolumeChart() {
  return (
    <Card className="col-span-1 lg:col-span-2 bg-card">
      <CardHeader>
        <CardTitle>Delivery Volume</CardTitle>
        <CardDescription>Parcels processed over the last 7 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusDistributionPie() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Status Breakdown</CardTitle>
        <CardDescription>Current state of all active parcels.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px" }}
                itemStyle={{ color: "var(--color-foreground)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          {statusData.map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function FleetPerformanceBar() {
  return (
    <Card className="col-span-1 lg:col-span-3 bg-card">
      <CardHeader>
        <CardTitle>Fleet Performance</CardTitle>
        <CardDescription>Deliveries completed by each vehicle today.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fleetData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
        </div>
      </CardContent>
    </Card>
  );
}
