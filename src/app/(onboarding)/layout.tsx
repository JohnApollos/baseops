import type { Metadata } from "next";
import { Package } from "lucide-react";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Set up your logistics organization on BaseOps.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Logo + Title */}
      <div className="flex items-center gap-2 mb-8">
        <Package className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold tracking-tight">BaseOps</span>
      </div>

      {/* Step content */}
      <div className="w-full max-w-lg animate-fade-in">{children}</div>
    </div>
  );
}
