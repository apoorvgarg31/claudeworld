'use client'

interface LoadingSkeletonProps {
  /** Width class e.g. 'w-full', 'w-48' */
  width?: string
  /** Height class e.g. 'h-4', 'h-8' */
  height?: string
  /** Border radius class */
  rounded?: string
  /** Number of skeleton lines */
  lines?: number
  /** Additional className */
  className?: string
}

/**
 * Skeleton loading placeholder for content that's being fetched
 */
export default function LoadingSkeleton({
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded',
  lines = 1,
  className = '',
}: LoadingSkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading content">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${width} ${height} ${rounded} bg-white/10 animate-pulse`}
          style={{
            width: lines > 1 && i === lines - 1 ? '75%' : undefined,
          }}
        />
      ))}
    </div>
  )
}
