export function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-sentinel-border rounded-lg py-12 px-6 text-center">
      <div className="text-slate-400 text-sm">{message}</div>
      <div className="mt-3 text-xs text-slate-500 font-mono">
        sentinel scan --framework hipaa --path ./demo-clinic-app
      </div>
    </div>
  );
}
