import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Portal",
  description: "Platform-level administration.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">BaseOps</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">
            Super Admin
          </span>
        </div>
      </header>
      <main className="p-6 animate-fade-in">{children}</main>
    </div>
  );
}
