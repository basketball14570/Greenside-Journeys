// Loading placeholders. The `Skeleton` primitive is a single shimmering
// rect; the higher-level helpers compose it into row/card layouts that
// match the shape of the real data so the page doesn't jump on hydration.

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  rounded?: number;
};

export function Skeleton({
  width = "100%",
  height = 14,
  className = "",
  style,
  rounded,
}: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`gs-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius: rounded ?? 6,
        ...style,
      }}
    />
  );
}

// A single leaderboard-style row skeleton. Mirrors the grid layout of
// /dashboard/leaderboard and /dashboard/showdown so pages don't pop.
export function SkeletonRow() {
  return (
    <div
      className="grid gap-2 px-4 py-3 border-b border-line/50 last:border-b-0"
      style={{ gridTemplateColumns: "44px 1.7fr 70px 80px 70px 1fr" }}
    >
      <Skeleton height={12} width={28} />
      <div className="flex flex-col gap-1.5">
        <Skeleton height={14} width="60%" />
        <Skeleton height={9} width="35%" />
      </div>
      <Skeleton height={14} />
      <Skeleton height={14} />
      <Skeleton height={14} />
      <Skeleton height={14} width="50%" />
    </div>
  );
}

// Bigger card-shaped skeleton for the bets page / dashboard cards.
export function SkeletonCard({ height = 96 }: { height?: number }) {
  return (
    <div
      className="rounded-[14px] border border-line p-4 flex flex-col gap-2.5 bg-surface-1"
      style={{ minHeight: height }}
    >
      <div className="flex items-center gap-2">
        <Skeleton height={16} width={36} rounded={4} />
        <Skeleton height={10} width={48} />
        <span className="flex-1" />
        <Skeleton height={12} width={60} />
      </div>
      <Skeleton height={16} width="55%" />
      <Skeleton height={11} width="40%" />
    </div>
  );
}
