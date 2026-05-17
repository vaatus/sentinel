"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function RescanButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (DEMO_MODE) return;
    setBusy(true);
    try {
      await fetch("/api/scan", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={go}
      disabled={busy || DEMO_MODE}
      title={DEMO_MODE ? "Disabled in the public demo — clone the repo to run a real scan." : ""}
      className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-sentinel-border bg-slate-800/40 hover:bg-slate-800 text-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
      {DEMO_MODE ? "Re-scan (demo)" : "Re-scan"}
    </button>
  );
}
