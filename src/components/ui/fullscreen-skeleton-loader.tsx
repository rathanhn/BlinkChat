import { Skeleton } from "./skeleton";

export function FullscreenSkeletonLoader() {
  return (
    <div className="flex flex-col h-screen items-center justify-between p-4">
      {/* Header Skeleton */}
      <div className="w-full max-w-md space-y-4 pt-16">
        <Skeleton className="h-10 w-2/3 mx-auto" /> {/* Title */}
        <Skeleton className="h-6 w-full mx-auto" /> {/* Subtitle */}
      </div>

      {/* Main Content Skeleton - Interests Section */}
      <div className="flex-1 flex flex-col justify-center items-center w-full max-w-md space-y-4">
        <Skeleton className="h-8 w-3/4" /> {/* "Add or confirm interests" */}
        <Skeleton className="h-6 w-1/2" /> {/* "We've pre-filled..." */}
        <div className="flex flex-wrap gap-2 justify-center w-full mt-4">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full mt-4 rounded-full" /> {/* Interest input */}
      </div>

      {/* Footer Skeleton - Find Match Button */}
      <div className="w-full max-w-md pb-16">
        <Skeleton className="h-12 w-full rounded-full" /> {/* Find Match button */}
      </div>
    </div>
  );
}
