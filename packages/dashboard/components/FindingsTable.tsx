import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Finding } from "../lib/data";
import { severityColor } from "../lib/data";

export function FindingsTable({ findings, limit }: { findings: Finding[]; limit?: number }) {
  const rows = limit ? findings.slice(0, limit) : findings;

  if (rows.length === 0) {
    return (
      <div className="text-sm text-slate-500 py-8 text-center border border-dashed border-sentinel-border rounded-lg">
        No findings. Run <code className="px-1 text-slate-300">sentinel scan</code> to populate.
      </div>
    );
  }

  return (
    <div className="border border-sentinel-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/30 text-xs uppercase tracking-widest text-slate-500">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Sev</th>
            <th className="text-left px-4 py-3 font-medium">Control</th>
            <th className="text-left px-4 py-3 font-medium">Location</th>
            <th className="text-left px-4 py-3 font-medium">Title</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => (
            <tr key={f.id} className="border-t border-sentinel-border hover:bg-slate-800/30 transition">
              <td className="px-4 py-3">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-widest border ${severityColor(f.severity)}`}>
                  {f.severity}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-300">{f.control}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-400">
                {f.file}:{f.line_start}
              </td>
              <td className="px-4 py-3 text-slate-200">{f.control_name}</td>
              <td className="px-4 py-3">
                <span className="text-xs text-slate-400">{f.status}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/findings/${encodeURIComponent(f.id)}`}
                  className="inline-flex items-center text-xs text-sentinel-accent hover:text-sky-300"
                >
                  Detail <ChevronRight className="w-3 h-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
