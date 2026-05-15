import {
  AlertActionBar,
  AlertDetailHeader,
  AlertHero,
  Exposure,
  PlayerSensitivity,
} from "@/components/edge/alert-detail";

// Single-alert detail screen. Statically rendered against the design's
// wave-shift example for now; once alerts persist in Postgres this fetches by id.
export default function AlertDetailPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <div className="pt-3">
        <AlertDetailHeader />
      </div>
      <div className="flex-1">
        <AlertHero />
        <Exposure />
        <PlayerSensitivity />
      </div>
      <AlertActionBar />
    </div>
  );
}
