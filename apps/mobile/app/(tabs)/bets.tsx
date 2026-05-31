import WebViewScreen from "@/components/WebViewScreen";

// Live open-bet tracking — graded against the live ESPN leaderboard,
// the same screen as greensideedge.com/dashboard/live.
export default function Live() {
  return <WebViewScreen path="/dashboard/live" />;
}
