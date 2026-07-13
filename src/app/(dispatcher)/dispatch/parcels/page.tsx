"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ParcelStatusBadge } from "@/components/dispatch/parcel-status-badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Parcel } from "@/types";

interface ParcelWithDriver extends Parcel {
  driver: { full_name: string } | null;
}

export default function ParcelsListPage() {
  const [parcels, setParcels] = useState<ParcelWithDriver[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadParcels() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user's organization
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("org_id")
          .eq("id", user.id)
          .single();

        if (profileErr || !profile?.org_id) {
          toast.error("Failed to load organization context.");
          setLoading(false);
          return;
        }

        // Fetch parcels and join with driver profile
        const { data: parcelsData, error: parcelsErr } = await supabase
          .from("parcels")
          .select("*, driver:profiles(full_name)")
          .eq("org_id", profile.org_id)
          .order("created_at", { ascending: false });

        if (parcelsErr) throw parcelsErr;
        setParcels((parcelsData as any) || []);
      } catch (err: any) {
        toast.error("Error loading parcels: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadParcels();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Parcels</h1>
          <p className="text-muted-foreground">
            {loading ? "Loading..." : `${parcels.length} parcels in your organization.`}
          </p>
        </div>
        <Link href="/dispatch/parcels/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Parcel
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking Code</TableHead>
              <TableHead>Sender</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead className="hidden md:table-cell">Address</TableHead>
              <TableHead className="hidden sm:table-cell">Weight</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Driver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Loading parcel list...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : parcels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 py-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                    <p className="font-medium text-base">No parcels registered</p>
                    <p className="text-sm">Click &quot;New Parcel&quot; to register your first delivery item.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              parcels.map((parcel) => (
                <TableRow key={parcel.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-code text-primary text-sm font-semibold">
                    {parcel.tracking_code}
                  </TableCell>
                  <TableCell className="text-sm">{parcel.sender_name}</TableCell>
                  <TableCell className="text-sm font-medium">
                    {parcel.recipient_name}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {parcel.recipient_address}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm font-code">
                    {parcel.weight_kg} kg
                  </TableCell>
                  <TableCell>
                    <ParcelStatusBadge status={parcel.status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {parcel.driver?.full_name || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
