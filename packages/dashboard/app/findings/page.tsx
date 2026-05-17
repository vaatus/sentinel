import { loadSnapshot } from "../../lib/data";
import { FindingsTable } from "../../components/FindingsTable";
import { EmptyState } from "../../components/EmptyState";

export const dynamic = process.env.NEXT_OUTPUT_EXPORT === "true" ? "force-static" : "force-dynamic";

export default function FindingsPage() {
  const snap = loadSnapshot();

  return (
    <div className="p-8 max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">All Findings</h1>
        <p className="text-sm text-slate-400 mt-1">
          {snap.findings.length} finding{snap.findings.length === 1 ? "" : "s"} from the latest scan
        </p>
      </header>
      {snap.findings.length === 0 ? (
        <EmptyState message="No findings yet." />
      ) : (
        <FindingsTable findings={snap.findings} />
      )}
    </div>
  );
}
