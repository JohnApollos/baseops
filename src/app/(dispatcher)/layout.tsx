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
      {/* Sidebar */}
      <DispatchSidebar />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
