export default function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-3xl border border-mint-100 bg-white/70 p-6 text-sm font-semibold text-muted shadow-card">
      {label}
    </div>
  );
}
