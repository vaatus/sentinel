import Link from "next/link";
import { Shield, FileSearch, GitPullRequest, Activity, Workflow } from "lucide-react";

const nav = [
  { href: "/", label: "Overview", icon: Shield },
  { href: "/findings", label: "Findings", icon: FileSearch },
  { href: "/data-flow", label: "PHI Data Flow", icon: Workflow },
  { href: "/prs", label: "Remediation PRs", icon: GitPullRequest },
  { href: "/bob", label: "Bob Sessions", icon: Activity },
];

export function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-sentinel-panel border-r border-sentinel-border flex flex-col">
      <div className="px-5 py-5 border-b border-sentinel-border">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-sentinel-accent" />
          <div className="font-semibold tracking-tight">SENTINEL</div>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
          powered by IBM Bob
        </div>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
          >
            <Icon className="w-4 h-4 text-slate-400" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-sentinel-border">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">Session</div>
        <div className="text-xs text-slate-400 mt-1">Local · demo-clinic-app</div>
      </div>
    </aside>
  );
}
