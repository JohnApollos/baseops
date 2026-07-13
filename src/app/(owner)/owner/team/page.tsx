"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TeamTable, type TeamMember } from "@/components/owner/team-table";
import { InviteMemberDialog } from "@/components/owner/invite-member-dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadTeam() {
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

        // Fetch team members (all profiles in the same org)
        const { data: teamData, error: teamErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("org_id", profile.org_id)
          .order("created_at", { ascending: false });

        if (teamErr) throw teamErr;

        // Map database profiles to TeamMember layout interface
        const mappedMembers: TeamMember[] = (teamData || []).map((m) => ({
          id: m.id,
          full_name: m.full_name,
          email: (m as any).email || m.phone || "No contact info",
          role: m.role,
          onboarded_at: m.onboarded_at,
        }));

        setMembers(mappedMembers);
      } catch (err: any) {
        toast.error("Error loading team members: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadTeam();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading team directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground font-light text-sm">
            Manage your drivers, dispatchers, and co-owners.
          </p>
        </div>
        <InviteMemberDialog />
      </div>

      <TeamTable members={members} />
    </div>
  );
}
