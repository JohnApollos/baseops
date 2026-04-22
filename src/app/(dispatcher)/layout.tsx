import type { Metadata } from "next";
import { DispatchSidebar } from "@/components/shared/dispatch-sidebar";

export const metadata: Metadata = {
  title: "Dispatch Center",
  description: "Operational command center for dispatchers and owners.",
};

export default function DispatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar (desktop: visible, mobile: hamburger) */}
      <DispatchSidebar />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar spacer */}
        <div className="md:hidden h-14" />
        <div className="p-4 md:p-6 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
