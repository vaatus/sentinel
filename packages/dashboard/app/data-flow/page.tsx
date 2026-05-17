import { loadSnapshot } from "../../lib/data";
import { DataFlowGraph } from "../../components/DataFlowGraph";
import { EmptyState } from "../../components/EmptyState";

export const dynamic = process.env.NEXT_OUTPUT_EXPORT === "true" ? "force-static" : "force-dynamic";

export default function DataFlowPage() {
  const snap = loadSnapshot();
  const flows = snap.flows;

  return (
    <div className="p-8 max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">PHI Data Flow</h1>
        <p className="text-sm text-slate-400 mt-1">
          Bob's <span className="font-mono text-xs text-slate-300">phi-tracer</span> mapped {flows.length} PHI flow{flows.length === 1 ? "" : "s"} across the repository.
          Violating sinks are highlighted in red.
        </p>
      </header>
      {flows.length === 0 ? (
        <EmptyState message="No PHI flows traced yet." />
      ) : (
        <DataFlowGraph flows={flows} />
      )}
    </div>
  );
}
