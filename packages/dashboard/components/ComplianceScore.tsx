import { scoreColor, scoreVerdict } from "../lib/data";

export function ComplianceScore({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (score / 100) * circumference;
  const ringColor = score >= 85 ? "#34d399" : score >= 60 ? "#fbbf24" : "#fb7185";

  return (
    <div className="bg-sentinel-panel border border-sentinel-border rounded-xl p-6 flex items-center gap-6">
      <div className="relative w-36 h-36 shrink-0">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 140 140">
          <circle
            cx="70" cy="70" r="60"
            stroke="#1e293b" strokeWidth="10" fill="none"
          />
          <circle
            cx="70" cy="70" r="60"
            stroke={ringColor}
            strokeWidth="10" fill="none" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-4xl font-bold ${scoreColor(score)}`}>{score}</div>
          <div className="text-xs text-slate-500">/ 100</div>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-widest text-slate-500">Compliance Score</div>
        <div className={`text-2xl font-semibold mt-1 ${scoreColor(score)}`}>
          {scoreVerdict(score)}
        </div>
        <div className="text-sm text-slate-400 mt-2 max-w-md">
          Weighted across all open findings. Critical findings carry an 8-point
          penalty; high 4; medium 2; low 1.
        </div>
      </div>
    </div>
  );
}
