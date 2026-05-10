"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface TeamMember {
  id: string;
  full_name: string;
  email?: string;
  role: "owner" | "dispatcher" | "driver";
  onboarded_at: string | null;
}

interface TeamTableProps {
  members: TeamMember[];
}

export function TeamTable({ members }: TeamTableProps) {
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="font-medium">{member.full_name || "Pending Invite"}</div>
                {member.email && (
                  <div className="text-xs text-muted-foreground">{member.email}</div>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    member.role === "owner"
                      ? "border-primary text-primary"
                      : member.role === "dispatcher"
                      ? "border-info text-info"
                      : "border-muted-foreground text-muted-foreground"
                  }
                >
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                {member.onboarded_at ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-success font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-success"></span> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-warning font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-warning"></span> Pending
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {members.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                No team members found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
