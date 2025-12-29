import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean
}

export function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-gray-200 dark:bg-gray-700',
        shimmer && 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]',
        className
      )}
      {...props}
    />
  )
}

export function AvatarStackSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex -space-x-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-8 rounded-full border-2 border-white dark:border-gray-800" />
      ))}
    </div>
  )
}

export function SessionCardSkeleton() {
  return (
    <div className="rounded-xl border bg-white dark:bg-gray-800 p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-2/3" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <AvatarStackSkeleton count={4} />
      <div className="space-y-1">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

export function SessionListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SessionCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function StatsCardSkeleton() {
  return (
    <div className="rounded-xl border bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <SessionListSkeleton count={3} />
    </div>
  )
}

export function BillListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function GroupCardSkeleton() {
  return (
    <div className="rounded-xl border bg-white dark:bg-gray-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <AvatarStackSkeleton count={5} />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

export function GroupListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <GroupCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <SessionListSkeleton />
    </div>
  )
}
