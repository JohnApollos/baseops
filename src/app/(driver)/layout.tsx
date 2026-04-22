import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Driver Dashboard",
  description: "Your assigned deliveries for today.",
};

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile-first top navigation */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-lg px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">BaseOps</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
              Driver
            </span>
          </div>
          {/* Sync indicator placeholder - Phase 4 */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full p-4 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
