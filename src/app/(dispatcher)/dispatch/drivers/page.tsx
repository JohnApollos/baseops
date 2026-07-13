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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Plus, Loader2, Mail, Phone, AlertCircle } from "lucide-react";
import type { Profile } from "@/types";

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({}); // Mapping profile ID to email from a user lookup
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Invite driver form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function loadOrgAndDrivers() {
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
          toast.error("Failed to load your organization context.");
          setLoading(false);
          return;
        }

        setOrgId(profile.org_id);

        // Fetch drivers
        const { data: driverData, error: driverErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("org_id", profile.org_id)
          .eq("role", "driver")
          .order("created_at", { ascending: false });

        if (driverErr) throw driverErr;
        setDrivers(driverData || []);

        // Also fetch emails for these drivers from our API or invite list (since auth.users emails require service-role/admin privilege, we can fetch them via a helper if needed or fallback)
      } catch (err: any) {
        toast.error("Error loading drivers: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadOrgAndDrivers();
  }, []);

  async function handleInviteDriver(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;

    if (!email.trim() || !fullName.trim()) {
      toast.error("Name and Email are required.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/invite-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role: "driver",
          fullName: fullName.trim(),
          orgId,
          phone: phone.trim() || null,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Failed to invite driver.");
      }

      toast.success(`Driver ${fullName} invited successfully!`);
      
      // Add newly invited driver profile directly to local state
      if (resData.profile) {
        setDrivers((prev) => [resData.profile, ...prev]);
      } else {
        // Fallback: Reload driver profiles from database
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("org_id", orgId)
          .eq("role", "driver")
          .order("created_at", { ascending: false });
        setDrivers(data || []);
      }

      setFullName("");
      setEmail("");
      setPhone("");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Driver Workforce</h1>
        <p className="text-muted-foreground">
          Invite, monitor status, and manage the drivers in your fleet.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Invite Driver Form */}
        <div className="md:col-span-1">
          <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b pb-3">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Onboard Driver</h2>
            </div>
            
            <form onSubmit={handleInviteDriver} className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Full Name</Label>
                <Input
                  id="driverName"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={submitting || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="driverEmail">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="driverEmail"
                    type="email"
                    placeholder="name@company.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting || loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="driverPhone">Phone Number (Optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="driverPhone"
                    placeholder="e.g. +254700000000"
                    className="pl-9"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting || loading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting || loading}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invite...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Onboard Driver
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Side: Drivers Directory */}
        <div className="md:col-span-2">
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Registered Drivers ({drivers.length})</h3>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span>Loading drivers directory...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : drivers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2 py-4">
                          <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                          <p className="font-medium text-base">No drivers onboarded</p>
                          <p className="text-sm">Use the form on the left to invite a driver to join your organization.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    drivers.map((d) => (
                      <TableRow key={d.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-semibold">{d.full_name || "Pending Invite"}</div>
                          <div className="text-xs text-muted-foreground">ID: {d.id.substring(0, 8)}...</div>
                        </TableCell>
                        <TableCell className="text-sm text-foreground/80 font-code">
                          {d.phone || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              d.onboarded_at
                                ? "border-success text-success bg-success/5"
                                : "border-warning text-warning bg-warning/5"
                            }
                          >
                            {d.onboarded_at ? "Active" : "Pending Invite"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {new Date(d.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
