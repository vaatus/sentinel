"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";

export function AutoRemediateButton({ openCount }: { openCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/remediate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "unknown");
      setMsg(`Bob opened ${data.remediated} pull requests. Re-scanning…`);
      const res2 = await fetch("/api/scan", { method: "POST" });
      const d2 = await res2.json();
      if (!res2.ok) throw new Error(d2?.error ?? "scan failed");
      setMsg(`Score jumped to ${d2.score}/100. Refreshing…`);
      router.refresh();
    } catch (e: any) {
      setMsg(`Failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={go}
        disabled={busy || openCount === 0}
        className="w-full inline-flex items-center justify-center gap-2 bg-sentinel-accent text-slate-900 font-semibold px-5 py-3 rounded-md hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Bob is opening PRs…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Auto-remediate {openCount} finding{openCount === 1 ? "" : "s"} with Bob
          </>
        )}
      </button>
      {msg && (
        <div className="mt-3 text-sm text-slate-400">{msg}</div>
      )}
    </div>
  );
}
