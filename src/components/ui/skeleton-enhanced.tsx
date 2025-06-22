import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'button'
}

function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'card':
        return 'h-32 w-full rounded-2xl'
      case 'text':
        return 'h-4 w-full rounded-lg'
      case 'avatar':
        return 'h-12 w-12 rounded-full'
      case 'button':
        return 'h-10 w-24 rounded-xl'
      default:
        return 'h-4 w-full rounded-lg'
    }
  }

  return (
    <div
      className={cn(
        "skeleton animate-shimmer",
        getVariantClass(),
        className
      )}
      {...props}
    />
  )
}

// Preset skeleton layouts
export function TransactionSkeleton() {
  return (
    <div className="glass rounded-2xl p-6 border animate-scale-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Skeleton variant="avatar" />
          <div className="space-y-2 flex-1">
            <Skeleton variant="text" className="w-3/4" />
            <Skeleton variant="text" className="w-1/2" />
          </div>
        </div>
        <Skeleton variant="text" className="w-24" />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero skeleton */}
      <div className="glass rounded-3xl p-8 border">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Skeleton variant="avatar" className="w-16 h-16" />
            <div className="space-y-2">
              <Skeleton variant="text" className="w-48" />
              <Skeleton variant="text" className="w-32" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton variant="button" />
            <Skeleton variant="button" />
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-24" />
        ))}
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-32" />
        ))}
      </div>
    </div>
  )
}

export { Skeleton } 