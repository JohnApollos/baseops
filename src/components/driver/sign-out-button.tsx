"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export function DriverSignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Signed out successfully.");
      router.push("/login");
      router.refresh();
    } catch (err: any) {
      toast.error("Failed to sign out: " + err.message);
    }
  }

  return (
    <button
      onClick={handleSignOut}
      className="p-1.5 rounded-lg border bg-card text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all flex items-center justify-center cursor-pointer"
      title="Sign Out"
      type="button"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
