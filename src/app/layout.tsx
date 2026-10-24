import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Ente Vaahanam",
  description: "Track vehicle maintenance and get reminded before things are due.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Ente Vaahanam", statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#090a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full bg-[#090b10] text-zinc-100 font-sans selection:bg-teal-500/30 selection:text-teal-200 relative overflow-x-hidden">
        {/* Ambient cockpit background lighting */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-40">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[450px] w-[650px] rounded-full bg-teal-600/20 blur-[130px]" />
          <div className="absolute top-1/2 -right-40 h-[400px] w-[400px] rounded-full bg-emerald-700/10 blur-[140px]" />
        </div>
        <div className="relative z-10">
          {children}
        </div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
