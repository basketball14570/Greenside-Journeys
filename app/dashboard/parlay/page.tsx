import { redirect } from "next/navigation";

// The old desktop parlay tracker shipped with a hardcoded sample parlay
// from the previous week's tournament, which left stale "Player not in
// field" legs visible whenever the active event changed. The mobile
// /dashboard/live page covers the same job (open bets graded against
// the live leaderboard) and works on desktop too, so we redirect here
// instead of maintaining a parallel surface. Bookmarks keep working.
export default function ParlayPage() {
  redirect("/dashboard/live");
}
