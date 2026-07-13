"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Save, Loader2, Wallet } from "lucide-react";
import type { Organization } from "@/types";

export default function OrganizationSettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function loadOrganization() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user profile and org_id
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

        // Fetch organization details
        const { data: orgData, error: orgErr } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profile.org_id)
          .single();

        if (orgErr) throw orgErr;
        setOrg(orgData);
        setOrgName(orgData.name);
        setOrgSlug(orgData.slug);
      } catch (err: any) {
        toast.error("Error loading organization settings: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadOrganization();
  }, [supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;

    if (!orgName.trim() || !orgSlug.trim()) {
      toast.error("Company name and slug cannot be empty.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: orgName.trim(),
          slug: orgSlug.trim().toLowerCase(),
        })
        .eq("id", org.id);

      if (error) throw error;
      
      toast.success("Organization settings updated successfully.");
      
      // Update local state
      setOrg((prev) => prev ? { ...prev, name: orgName, slug: orgSlug } : null);
    } catch (err: any) {
      toast.error("Failed to save changes: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading organization settings...</p>
      </div>
    );
  }

  const walletBalance = org?.wallet_balance || 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization Profile</h1>
        <p className="text-muted-foreground">Manage your company details and tenant settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Wallet Balance Card */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              KES {walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Available for SMS & route optimizations</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full">Top Up Balance</Button>
          </CardFooter>
        </Card>
      </div>

      {/* General Settings */}
      <Card className="border-border/50 bg-card/45 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            General Settings
          </CardTitle>
          <CardDescription>
            Update your organization name and URL slug.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Company Name</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm bg-muted px-3 py-2 rounded-md border border-input">
                  baseops.app/
                </span>
                <Input
                  id="org-slug"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  className="font-code flex-1"
                  disabled={submitting}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Changing your slug will invalidate existing team invitation links.
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t p-4 mt-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
