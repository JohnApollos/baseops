"use client";

import { useEffect, useState, useCallback } from "react";
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
import { PlusCircle, Loader2, AlertCircle, Coins, CheckCircle, ShieldAlert, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Parcel } from "@/types";
import { ManifestImporterDialog } from "@/components/dispatch/manifest-importer-dialog";

interface ParcelWithDriver extends Parcel {
  driver: { full_name: string } | null;
}

export default function ParcelsListPage() {
  const [parcels, setParcels] = useState<ParcelWithDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "cod" | "disputed">("all");
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const supabase = createClient();

  const loadParcels = useCallback(async () => {
    setLoading(true);
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
        return;
      }

      setOrgId(profile.org_id);

      // Fetch parcels and join with driver profile
      const { data: parcelsData, error: parcelsErr } = await supabase
        .from("parcels")
        .select("*, driver:profiles(full_name)")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false });

      if (parcelsErr) throw parcelsErr;
      setParcels((parcelsData as unknown as ParcelWithDriver[]) || []);
    } catch (err: unknown) {
      toast.error("Error loading parcels: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;
    async function initParcels() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("org_id")
          .eq("id", user.id)
          .single();

        if (profileErr || !profile?.org_id) {
          if (isMounted) toast.error("Failed to load organization context.");
          return;
        }

        if (!isMounted) return;
        setOrgId(profile.org_id);

        const { data: parcelsData, error: parcelsErr } = await supabase
          .from("parcels")
          .select("*, driver:profiles(full_name)")
          .eq("org_id", profile.org_id)
          .order("created_at", { ascending: false });

        if (parcelsErr) throw parcelsErr;
        if (isMounted) {
          setParcels((parcelsData as unknown as ParcelWithDriver[]) || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          toast.error("Error loading parcels: " + (err as Error).message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    initParcels();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function handleMarkReconciled(parcelId: string) {
    setReconcilingId(parcelId);
    try {
      const { error } = await supabase
        .from("parcels")
        .update({ reconciliation_status: "reconciled" })
        .eq("id", parcelId);

      if (error) throw error;
      toast.success("Parcel marked as reconciled ✓");
      setParcels((prev) =>
        prev.map((p) => (p.id === parcelId ? { ...p, reconciliation_status: "reconciled" } : p))
      );
    } catch (err: unknown) {
      toast.error("Reconciliation update failed: " + (err as Error).message);
    } finally {
      setReconcilingId(null);
    }
  }

  // Financial Settlement KPIs
  const totalExpectedCOD = parcels.reduce((sum, p) => sum + Number(p.cod_amount || 0), 0);
  const totalCollectedCOD = parcels.reduce((sum, p) => sum + Number(p.collected_amount || 0), 0);
  const disputedCount = parcels.filter((p) => p.reconciliation_status === "disputed").length;
  const variance = Math.max(0, totalExpectedCOD - totalCollectedCOD);

  // Filtered parcels view
  const displayedParcels = parcels.filter((p) => {
    if (filterMode === "cod") return Number(p.cod_amount || 0) > 0;
    if (filterMode === "disputed") return p.reconciliation_status === "disputed";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parcels & Settlement Ledger</h1>
          <p className="text-muted-foreground text-sm">
            {loading ? "Loading..." : `${parcels.length} operational units across current dispatch cycle.`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {orgId && <ManifestImporterDialog orgId={orgId} onImportComplete={loadParcels} />}
          <Link href="/dispatch/parcels/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Parcel
            </Button>
          </Link>
        </div>
      </div>

      {/* Financial Settlement KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase">Expected COD</span>
            <Coins className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-code text-foreground">
            KES {totalExpectedCOD.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Total receivables from daily manifest</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase">Collected In Field</span>
            <CheckCircle className="h-4 w-4 text-success" />
          </div>
          <div className="text-2xl font-bold font-code text-success">
            KES {totalCollectedCOD.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Confirmed driver cash & M-Pesa intake</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase">Settlement Variance</span>
            <ArrowDownRight className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-code text-amber-500">
            KES {variance.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Pending driver return or return-to-origin</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase">Disputed Exceptions</span>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </div>
          <div className={`text-2xl font-bold font-code ${disputedCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {disputedCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Offline state collision or uncollected cash</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-2 text-xs">
        <button
          onClick={() => setFilterMode("all")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterMode === "all" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          All Parcels ({parcels.length})
        </button>
        <button
          onClick={() => setFilterMode("cod")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterMode === "cod" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          COD Active ({parcels.filter((p) => Number(p.cod_amount || 0) > 0).length})
        </button>
        <button
          onClick={() => setFilterMode("disputed")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterMode === "disputed" ? "bg-destructive text-destructive-foreground font-semibold" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Disputed Exceptions ({disputedCount})
        </button>
      </div>

      {/* Parcels Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking Code</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead className="hidden md:table-cell">Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expected COD</TableHead>
              <TableHead>Collected</TableHead>
              <TableHead>Settlement</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Loading parcel list...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : displayedParcels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 py-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                    <p className="font-medium text-base">No parcels matching filter</p>
                    <p className="text-sm">Click &quot;Import Manifest&quot; or &quot;New Parcel&quot; to register items.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayedParcels.map((parcel) => (
                <TableRow key={parcel.id} className="cursor-pointer hover:bg-muted/50 text-xs">
                  <TableCell className="font-code text-primary font-semibold">
                    {parcel.tracking_code}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{parcel.recipient_name}</div>
                    <div className="text-[11px] text-muted-foreground font-code">{parcel.recipient_phone}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground max-w-[160px] truncate">
                    {parcel.recipient_address}
                  </TableCell>
                  <TableCell>
                    <ParcelStatusBadge status={parcel.status} />
                  </TableCell>
                  <TableCell className="font-code font-semibold">
                    {parcel.cod_amount && parcel.cod_amount > 0 ? (
                      `KES ${parcel.cod_amount.toLocaleString()}`
                    ) : (
                      <span className="text-muted-foreground font-normal">Prepaid</span>
                    )}
                  </TableCell>
                  <TableCell className="font-code">
                    {parcel.collected_amount && parcel.collected_amount > 0 ? (
                      <span className="text-success font-semibold">KES {parcel.collected_amount.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">KES 0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {parcel.reconciliation_status === "disputed" ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-destructive/15 text-destructive border border-destructive/20">
                        Disputed
                      </span>
                    ) : parcel.reconciliation_status === "reconciled" ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-success/15 text-success border border-success/20">
                        Reconciled
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border">
                        Pending
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {parcel.reconciliation_status !== "reconciled" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reconcilingId === parcel.id}
                        onClick={() => handleMarkReconciled(parcel.id)}
                        className="h-7 text-xs border-success/30 text-success hover:bg-success/10"
                      >
                        {reconcilingId === parcel.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Reconcile"
                        )}
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Settled</span>
                    )}
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
