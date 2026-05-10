"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Save, Loader2, Wallet } from "lucide-react";

export default function OrganizationSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [orgName, setOrgName] = useState("QuickShip Logistics");
  const [orgSlug, setOrgSlug] = useState("quickship");

  // Mock wallet balance for Nairobi context (KES)
  const walletBalance = 45000.00;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    toast.success("Organization settings updated successfully.");
    setIsLoading(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization Profile</h1>
        <p className="text-muted-foreground">Manage your company details and tenant settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Wallet Balance Card */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
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
      <Card className="border-border/50 shadow-sm">
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
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Changing your slug will invalidate existing team invitation links.
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t p-4 mt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
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
