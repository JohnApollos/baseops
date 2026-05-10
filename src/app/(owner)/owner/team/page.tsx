import { TeamTable, type TeamMember } from "@/components/owner/team-table";
import { InviteMemberDialog } from "@/components/owner/invite-member-dialog";

// Mock data (in production, fetch via Supabase)
const teamMembers: TeamMember[] = [
  {
    id: "u1",
    full_name: "Sarah Jenkins",
    email: "sarah.j@quickship.com",
    role: "owner",
    onboarded_at: "2024-01-15T08:00:00Z",
  },
  {
    id: "u2",
    full_name: "Michael Chang",
    email: "michael.c@quickship.com",
    role: "dispatcher",
    onboarded_at: "2024-01-16T09:30:00Z",
  },
  {
    id: "u3",
    full_name: "David Omondi",
    email: "david.o@quickship.com",
    role: "driver",
    onboarded_at: "2024-02-01T14:15:00Z",
  },
  {
    id: "u4",
    full_name: "",
    email: "pending.driver@quickship.com",
    role: "driver",
    onboarded_at: null,
  },
];

export default function TeamManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">Manage your drivers, dispatchers, and co-owners.</p>
        </div>
        <InviteMemberDialog />
      </div>

      <TeamTable members={teamMembers} />
    </div>
  );
}
