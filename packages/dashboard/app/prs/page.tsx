import { loadSnapshot, loadRemediations } from "../../lib/data";
import { EmptyState } from "../../components/EmptyState";
import { GitPullRequest, GitBranch } from "lucide-react";

export const dynamic = "force-dynamic";

export default function PrsPage() {
  const snap = loadSnapshot();
  const prs = loadRemediations();

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Remediation PRs</h1>
        <p className="text-sm text-slate-400 mt-1">
          {prs.length} pull-request branch{prs.length === 1 ? "" : "es"} opened by Bob's <span className="font-mono text-xs text-slate-300">remediation-engineer</span> mode.
        </p>
      </header>

      {prs.length === 0 ? (
        <EmptyState message="No remediation PRs yet. Click 'Auto-remediate' on the Overview page." />
      ) : (
        <div className="space-y-4">
          {prs.map((pr) => {
            const finding = snap.findings.find((f) => f.id === pr.finding_id);
            return (
              <div key={pr.id} className="bg-sentinel-panel border border-sentinel-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-sentinel-border flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <GitPullRequest className="w-4 h-4 text-emerald-400" />
                      <span>{finding?.control_name ?? pr.finding_id}</span>
                      {finding && (
                        <span className="text-xs text-slate-500 font-mono">
                          {finding.control}
                        </span>
                      )}
                      {pr.status && pr.status !== "applied" && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                          {pr.status === "applied:working-tree-only" && "Working tree only"}
                          {pr.status === "skipped:dirty-tree" && "⚠ Needs manual apply (dirty tree)"}
                          {pr.status === "skipped:not-a-repo" && "⚠ Needs manual apply (not a repo)"}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
                      <GitBranch className="w-3 h-3" />
                      {pr.branch}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 text-right">
                    <div>{new Date(pr.created_at).toLocaleString()}</div>
                    {finding && (
                      <div className="font-mono mt-1">{finding.file}:{finding.line_start}</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-0">
                  <div className="border-r border-sentinel-border p-5">
                    <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                      Diff
                    </div>
                    <pre className="bg-slate-950 rounded p-3 text-[11px] text-slate-300 overflow-x-auto font-mono whitespace-pre">
{renderDiff(pr.diff)}
                    </pre>
                  </div>
                  <div className="p-5">
                    <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                      Rationale
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{pr.rationale}</p>

                    <div className="text-xs uppercase tracking-widest text-slate-500 mt-5 mb-2">
                      Blast Radius ({pr.blast_radius.length} files)
                    </div>
                    <ul className="space-y-1.5">
                      {pr.blast_radius.map((b: any, i: number) => (
                        <li key={i} className="text-xs">
                          <span className="font-mono text-slate-300">{b.file}</span>
                          <span className="text-slate-500"> — {b.impact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function renderDiff(diff: string): string {
  return diff
    .split("\n")
    .map((l) => {
      if (l.startsWith("+++") || l.startsWith("---")) return l;
      if (l.startsWith("@@")) return l;
      if (l.startsWith("+")) return l;
      if (l.startsWith("-")) return l;
      return l;
    })
    .join("\n");
}
