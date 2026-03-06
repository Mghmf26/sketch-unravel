import { Skeleton } from '@/components/ui/skeleton';

export function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="bg-muted/50 border-b px-4 py-3 flex gap-8">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className={`px-4 py-4 flex gap-8 border-b border-border/50 ${row % 2 === 1 ? 'bg-muted/20' : ''}`}>
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton key={col} className="h-4 w-20" style={{ width: `${60 + Math.random() * 40}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="p-8 space-y-6 max-w-7xl animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)}
      </div>
      <TableSkeleton />
    </div>
  );
}
