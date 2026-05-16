import "./globals.css";
import type { Metadata } from "next";
import { Sidebar } from "../components/Sidebar";

export const metadata: Metadata = {
  title: "Sentinel — Compliance Engineering Copilot",
  description: "Powered by IBM Bob. HIPAA / SOC2 / PCI audits + auto-remediation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-sentinel-bg text-slate-200 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-60">{children}</main>
        </div>
      </body>
    </html>
  );
}
