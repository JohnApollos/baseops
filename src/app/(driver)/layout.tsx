import type { Metadata } from "next";
import { SyncProvider } from "@/components/driver/sync-provider";
import { OfflineBanner } from "@/components/driver/offline-indicator";
import { OfflineIndicator } from "@/components/driver/offline-indicator";
import { Package } from "lucide-react";

export const metadata: Metadata = {
  title: "Driver Dashboard",
  description: "Your assigned deliveries for today.",
};

// ============================================================
// Driver Layout — mobile-first with offline capabilities.
// Wraps children in SyncProvider to initialize the sync engine.
// Shows an OfflineBanner when connectivity drops.
// ============================================================

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SyncProvider>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Offline banner — appears when disconnected */}
        <OfflineBanner />

        {/* Mobile-first top navigation */}
        <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-lg px-4 py-3">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold tracking-tight">BaseOps</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                Driver
              </span>
            </div>
            {/* Sync indicator */}
            <OfflineIndicator />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 max-w-lg mx-auto w-full p-4 animate-fade-in">
          {children}
        </main>
      </div>
    </SyncProvider>
  );
}
