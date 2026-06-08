export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Stat card skeletons */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-slate-100 bg-white p-5 space-y-2">
            <div className="h-3 w-16 bg-slate-200 rounded" />
            <div className="h-8 w-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="animate-pulse rounded-xl border border-slate-100 bg-white p-5 space-y-3">
        <div className="h-4 w-32 bg-slate-200 rounded" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-3 flex-1 bg-slate-200 rounded" />
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="h-3 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
