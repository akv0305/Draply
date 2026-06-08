export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border border-slate-100 bg-white p-5 space-y-3">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-3 w-48 bg-slate-200 rounded" />
          <div className="h-3 w-24 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}
