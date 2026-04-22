import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";
import "./globals.css";

// ----- Fonts -----
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ----- SEO Metadata -----
export const metadata: Metadata = {
  title: {
    default: "BaseOps — Multi-Tenant Logistics Platform",
    template: "%s | BaseOps",
  },
  description:
    "Open-source, production-grade multi-tenant PWA for logistics and last-mile delivery. Manage drivers, parcels, and routes — even offline.",
  keywords: [
    "logistics",
    "delivery management",
    "multi-tenant",
    "PWA",
    "offline-first",
    "fleet management",
  ],
  authors: [{ name: "BaseOps" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BaseOps",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// ----- Root Layout -----
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
