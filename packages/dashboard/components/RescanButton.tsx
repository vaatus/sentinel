"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";

export function RescanButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
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
      disabled={busy}
      className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-sentinel-border bg-slate-800/40 hover:bg-slate-800 text-slate-300 transition"
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
      Re-scan
    </button>
  );
}
