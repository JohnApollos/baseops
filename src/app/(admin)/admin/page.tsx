"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Building2, Users, Package, Wallet, Loader2, ArrowUpRight } from "lucide-react";
import type { Organization } from "@/types";

export default function AdminDashboardPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState({
    orgsCount: 0,
    usersCount: 0,
    parcelsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const supabase = createClient();

  async function loadAdminData() {
    try {
      // 1. Fetch all organizations
      const { data: orgsData, error: orgsErr } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (orgsErr) throw orgsErr;
      const orgs = orgsData || [];
      setOrganizations(orgs);

      // 2. Fetch total users count
      const { count: usersCount, error: usersErr } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // 3. Fetch total parcels count
      const { count: parcelsCount, error: parcelsErr } = await supabase
        .from("parcels")
        .select("*", { count: "exact", head: true });

      setStats({
        orgsCount: orgs.length,
        usersCount: usersCount || 0,
        parcelsCount: parcelsCount || 0,
      });
    } catch (err: any) {
      toast.error("Error loading admin controls: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  async function handleTogglePlan(orgId: string, currentPlan: string) {
    const nextPlan = currentPlan === "pro" ? "free" : "pro";
    setUpdatingId(orgId);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ plan: nextPlan })
        .eq("id", orgId);

      if (error) throw error;
      toast.success(`Subscription plan updated to ${nextPlan.toUpperCase()}`);
      
      // Update local state
      setOrganizations((prev) =>
        prev.map((o) => (o.id === orgId ? { ...o, plan: nextPlan as any } : o))
      );
    } catch (err: any) {
      toast.error("Plan update failed: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleQuickTopUp(orgId: string, currentBalance: number) {
    const topUpAmount = 10000.00; // Quick 10,000 KES top up
    setUpdatingId(orgId);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ wallet_balance: currentBalance + topUpAmount })
        .eq("id", orgId);

      if (error) throw error;
      toast.success(`Credited KES ${topUpAmount.toLocaleString()} to organization wallet.`);
      
      // Update local state
      setOrganizations((prev) =>
        prev.map((o) => (o.id === orgId ? { ...o, wallet_balance: o.wallet_balance + topUpAmount } : o))
      );
    } catch (err: any) {
      toast.error("Top up failed: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-light">Loading Super-Admin metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-destructive/15 text-destructive">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Super-Admin Controls</h1>
          <p className="text-muted-foreground text-sm font-light">
            Platform-level governance across all tenant organizations and operational units.
          </p>
        </div>
      </div>

      {/* Grid of Platform Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card/65 backdrop-blur-sm p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Tenants</p>
            <p className="text-3xl font-bold">{stats.orgsCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border bg-card/65 backdrop-blur-sm p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered Users</p>
            <p className="text-3xl font-bold">{stats.usersCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-info/10 text-info">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border bg-card/65 backdrop-blur-sm p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Processed Parcels</p>
            <p className="text-3xl font-bold">{stats.parcelsCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-success/10 text-success">
            <Package className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Organization Directory */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Tenant Organization Directory</h3>
          <p className="text-xs text-muted-foreground">Manage service subscription tiers and credit lines.</p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Wallet Balance</TableHead>
                <TableHead className="hidden sm:table-cell">Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No organizations exist on this instance.
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((o) => (
                  <TableRow key={o.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-semibold">{o.name}</div>
                      <div className="text-xs text-muted-foreground">ID: {o.id.substring(0, 8)}...</div>
                    </TableCell>
                    <TableCell className="font-code text-xs">/{o.slug}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          o.plan === "pro"
                            ? "border-primary text-primary bg-primary/5"
                            : "border-muted text-muted-foreground"
                        }
                      >
                        {o.plan.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-code text-sm font-semibold">
                      KES {o.wallet_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingId !== null}
                        onClick={() => handleTogglePlan(o.id, o.plan)}
                      >
                        {updatingId === o.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          `Make ${o.plan === "pro" ? "Free" : "Pro"}`
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-success text-success hover:bg-success/5 hover:text-success"
                        disabled={updatingId !== null}
                        onClick={() => handleQuickTopUp(o.id, o.wallet_balance)}
                      >
                        {updatingId === o.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <div className="flex items-center gap-1">
                            <Wallet className="h-3.5 w-3.5" />
                            +10k
                          </div>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
