import type { Finding } from "../lib/data";

export function SeverityCounts({ findings }: { findings: Finding[] }) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) counts[f.severity]++;

  const cells: Array<{ label: string; value: number; color: string; ring: string }> = [
    { label: "Critical", value: counts.critical, color: "text-rose-300",   ring: "border-rose-500/40 bg-rose-500/5" },
    { label: "High",     value: counts.high,     color: "text-orange-300", ring: "border-orange-500/40 bg-orange-500/5" },
    { label: "Medium",   value: counts.medium,   color: "text-amber-300",  ring: "border-amber-500/40 bg-amber-500/5" },
    { label: "Low",      value: counts.low,      color: "text-slate-300",  ring: "border-slate-500/40 bg-slate-500/5" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {cells.map((c) => (
        <div key={c.label} className={`border rounded-lg px-4 py-3 ${c.ring}`}>
          <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mt-1">
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}
