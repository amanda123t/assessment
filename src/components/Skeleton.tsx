'use client';

export function SkeletonLine({ width = '100%', height = '16px' }: { width?: string; height?: string }) {
  return (
    <div
      className="bg-gray-200 rounded-md animate-pulse"
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <SkeletonLine width="60%" height="20px" />
      <SkeletonLine width="80%" />
      <SkeletonLine width="40%" />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 last:border-b-0">
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="70%" height="14px" />
            <SkeletonLine width="40%" height="12px" />
          </div>
          <SkeletonLine width="80px" height="24px" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonMetrics() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
            <SkeletonLine width="120px" height="12px" />
          </div>
          <SkeletonLine width="80px" height="32px" />
          <SkeletonLine width="60%" height="12px" />
        </div>
      ))}
    </div>
  );
}
