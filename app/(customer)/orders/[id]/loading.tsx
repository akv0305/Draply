export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header skeleton */}
      <div className="animate-pulse space-y-2">
        <div className="h-4 w-28 bg-slate-200 rounded" />
        <div className="h-24 bg-slate-200 rounded-xl" />
      </div>
      {/* Items skeleton */}
      <div className="animate-pulse rounded-xl border border-slate-100 bg-white p-5 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex justify-between gap-4">
            <div className="h-4 flex-1 bg-slate-200 rounded" />
            <div className="h-4 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
