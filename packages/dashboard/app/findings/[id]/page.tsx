import Link from "next/link";
import { ArrowLeft, FileCode, AlertTriangle, GitPullRequest } from "lucide-react";
import { loadSnapshot, severityColor } from "../../../lib/data";

export const dynamic = process.env.NEXT_OUTPUT_EXPORT === "true" ? "force-static" : "force-dynamic";

// Required for static export of a dynamic route — pre-generate one
// page per finding from the snapshot at build time.
export function generateStaticParams() {
  if (process.env.NEXT_OUTPUT_EXPORT !== "true") return [];
  const snap = loadSnapshot();
  return snap.findings.map((f) => ({ id: encodeURIComponent(f.id) }));
}

export default function FindingDetailPage({ params }: { params: { id: string } }) {
  const snap = loadSnapshot();
  const f = snap.findings.find((x) => x.id === decodeURIComponent(params.id));

  if (!f) {
    return (
      <div className="p-8">
        <Link href="/findings" className="text-sm text-sentinel-accent inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div className="mt-6 text-slate-400">Finding not found.</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/findings" className="text-sm text-sentinel-accent inline-flex items-center gap-1 mb-6">
        <ArrowLeft className="w-3 h-3" /> All findings
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-widest border ${severityColor(f.severity)}`}>
            {f.severity}
          </span>
          <span className="font-mono text-xs text-slate-400">{f.control}</span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs text-slate-500 uppercase tracking-widest">{f.framework}</span>
        </div>
        <h1 className="text-2xl font-semibold mt-2">{f.control_name}</h1>
        <div className="text-sm text-slate-400 font-mono mt-1">{f.file}:{f.line_start}</div>
      </header>

      <section className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500 mb-2">
          <FileCode className="w-3.5 h-3.5" /> Offending Code
        </div>
        <pre className="bg-slate-900 border border-sentinel-border rounded-lg p-4 text-xs text-slate-200 overflow-x-auto font-mono">
{f.code_snippet}
        </pre>
      </section>

      <section className="mb-6 bg-sentinel-panel border border-sentinel-border rounded-lg p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500 mb-3">
          <AlertTriangle className="w-3.5 h-3.5" /> Bob's Analysis
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{f.explanation}</p>
        <div className="mt-4 pt-4 border-t border-sentinel-border">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Suggested Fix</div>
          <p className="text-sm text-slate-300">{f.remediation_hint}</p>
        </div>
      </section>

      <section className="text-xs text-slate-500 flex items-center gap-3">
        <GitPullRequest className="w-3 h-3" />
        Status: <span className="text-slate-300">{f.status}</span>
        {f.bob_session_id && (
          <>
            <span>·</span>
            <span>Bob session: <span className="font-mono">{f.bob_session_id}</span></span>
          </>
        )}
      </section>
    </div>
  );
}
