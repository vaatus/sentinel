import { loadSnapshot } from "../../lib/data";
import { Activity } from "lucide-react";

export const dynamic = process.env.NEXT_OUTPUT_EXPORT === "true" ? "force-static" : "force-dynamic";

const MODES = [
  {
    slug: "hipaa-auditor",
    name: "🏥 HIPAA Auditor",
    purpose: "Scans the codebase against 15 HIPAA Security Rule controls.",
  },
  {
    slug: "phi-tracer",
    name: "🔬 PHI Data Flow Tracer",
    purpose: "Traces every PHI source through functions, loggers, DBs, and HTTP sinks.",
  },
  {
    slug: "remediation-engineer",
    name: "🛠️ Remediation Engineer",
    purpose: "Generates minimal, safe patches with cross-file blast-radius analysis.",
  },
  {
    slug: "soc2-auditor",
    name: "🔒 SOC2 Auditor",
    purpose: "Trust Services Criteria (CC6/CC7/CC8) violations.",
  },
  {
    slug: "pci-auditor",
    name: "💳 PCI-DSS Auditor",
    purpose: "Cardholder data handling, encryption, and scope segmentation.",
  },
];

export default function BobPage() {
  const snap = loadSnapshot();
  const sessions = new Set(snap.findings.map((f) => f.bob_session_id).filter(Boolean));

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">IBM Bob Sessions</h1>
        <p className="text-sm text-slate-400 mt-1">
          Sentinel orchestrates Bob via five custom modes defined in <code className="text-slate-300">.bob/custom_modes.yaml</code>.
        </p>
      </header>

      <section className="mb-8">
        <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">Active Sessions</div>
        {sessions.size === 0 ? (
          <div className="text-sm text-slate-500">No sessions yet.</div>
        ) : (
          <ul className="space-y-2">
            {Array.from(sessions).map((s) => (
              <li key={s} className="bg-sentinel-panel border border-sentinel-border rounded-lg px-4 py-3 flex items-center gap-3">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-xs text-slate-300">{s}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">Custom Modes</div>
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((m) => (
            <div key={m.slug} className="bg-sentinel-panel border border-sentinel-border rounded-lg p-4">
              <div className="font-medium text-slate-200">{m.name}</div>
              <div className="text-xs font-mono text-slate-500 mt-0.5">{m.slug}</div>
              <p className="text-sm text-slate-400 mt-2">{m.purpose}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
