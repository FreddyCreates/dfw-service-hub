// Skeleton — loading skeleton primitives using the .skeleton and
// .animate-shimmer CSS utilities from index.css. Exports a base Skeleton
// primitive and a SkeletonCard variant for card-shaped loading states.
//
// Note: shadcn's ui/skeleton.tsx is a separate primitive (animate-pulse). This
// component uses the Workshop shimmer utilities for a richer loading effect
// that matches the design system's motion language.

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render as a circle (avatars, icons). */
  circle?: boolean;
}

export function Skeleton({
  className,
  circle = false,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton",
        circle && "rounded-full",
        !circle && "rounded-md",
        className,
      )}
      aria-hidden
      {...props}
    />
  );
}

interface SkeletonTextProps {
  /** Number of lines to render. */
  lines?: number;
  className?: string;
  /** Width of the last line as a Tailwind width utility. */
  lastWidth?: string;
}

export function SkeletonText({
  lines = 3,
  className,
  lastWidth = "w-2/3",
}: SkeletonTextProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder lines, order never changes
          key={i}
          className={cn("h-3", i === lines - 1 ? lastWidth : "w-full")}
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
  /** Show an image/media block at the top. */
  withMedia?: boolean;
}

export function SkeletonCard({
  className,
  withMedia = true,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-subtle space-y-4",
        className,
      )}
      data-ocid="skeleton_card"
      aria-hidden
    >
      {withMedia ? <Skeleton className="h-40 w-full rounded-lg" /> : null}
      <div className="flex items-center gap-3">
        <Skeleton circle className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  className?: string;
  withMedia?: boolean;
}

export function SkeletonList({
  count = 3,
  className,
  withMedia = true,
}: SkeletonListProps) {
  return (
    <div
      className={cn("grid gap-4", className)}
      data-ocid="skeleton_list"
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder cards, order never changes
          key={i}
          withMedia={withMedia}
        />
      ))}
    </div>
  );
}
