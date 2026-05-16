import { loadSnapshot } from "../lib/data";
import { ComplianceScore } from "../components/ComplianceScore";
import { SeverityCounts } from "../components/SeverityCounts";
import { FindingsTable } from "../components/FindingsTable";
import { AutoRemediateButton } from "../components/AutoRemediateButton";
import { RescanButton } from "../components/RescanButton";
import { EmptyState } from "../components/EmptyState";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default function OverviewPage() {
  const snap = loadSnapshot();

  if (!snap.scanRun) {
    return (
      <div className="p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-slate-400 mt-1">No scan data yet.</p>
        </header>
        <EmptyState message="Run sentinel scan to populate this dashboard." />
      </div>
    );
  }

  const score = snap.scanRun.score;
  const openCount = snap.findings.filter((f) => f.status === "open").length;
  const violatingFlows = snap.flows.filter((f) => f.is_violating).length;

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compliance Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            <span className="uppercase tracking-widest text-xs">{snap.scanRun.framework}</span>
            <span className="mx-2 text-slate-600">·</span>
            {snap.scanRun.target_path}
            <span className="mx-2 text-slate-600">·</span>
            {new Date(snap.scanRun.started_at).toLocaleString()}
          </p>
        </div>
        <RescanButton />
      </header>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2">
          <ComplianceScore score={score} />
        </div>
        <div className="bg-sentinel-panel border border-sentinel-border rounded-xl p-6 flex flex-col">
          <div className="text-xs uppercase tracking-widest text-slate-500">Auto-remediate</div>
          <div className="mt-2 text-sm text-slate-400 flex-1">
            Bob opens a pull-request branch for every open finding, each with a
            cross-file blast-radius analysis.
          </div>
          <div className="mt-4">
            <AutoRemediateButton openCount={openCount} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-sentinel-panel border border-sentinel-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">Severity Breakdown</div>
          <SeverityCounts findings={snap.findings} />
        </div>
        <div className="bg-sentinel-panel border border-sentinel-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">Scan Telemetry</div>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-slate-500">Files scanned</dt>
            <dd className="text-slate-200 font-mono">{snap.scanRun.total_files}</dd>
            <dt className="text-slate-500">Open findings</dt>
            <dd className="text-slate-200 font-mono">{openCount}</dd>
            <dt className="text-slate-500">PHI data flows</dt>
            <dd className="text-slate-200 font-mono">{snap.flows.length}</dd>
            <dt className="text-slate-500">Violating flows</dt>
            <dd className="text-slate-200 font-mono">{violatingFlows}</dd>
            <dt className="text-slate-500">Bob session</dt>
            <dd className="text-slate-200 font-mono text-xs truncate">
              {snap.findings[0]?.bob_session_id ?? "—"}
            </dd>
          </dl>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-widest text-slate-500">Top Findings</h2>
          <a href="/findings" className="text-xs text-sentinel-accent hover:text-sky-300">
            View all →
          </a>
        </div>
        <FindingsTable findings={snap.findings} limit={6} />
      </section>
    </div>
  );
}
