import WebViewScreen from "@/components/WebViewScreen";

// Home = the betting command center, rendered from greensideedge.com so
// it keeps the exact web design (live bets, leaderboard, course guide all
// reachable via the page's own nav).
export default function Command() {
  return <WebViewScreen path="/dashboard/command" />;
}
