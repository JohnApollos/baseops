import type { Metadata } from "next";
import { OwnerSidebar } from "@/components/shared/owner-sidebar";

export const metadata: Metadata = {
  title: "Owner Portal",
  description: "Organization management, analytics, and billing.",
};

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <OwnerSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden h-14" />
        <div className="p-4 md:p-6 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
