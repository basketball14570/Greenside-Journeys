import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { buildHandoffUrl } from "@/lib/web-handoff";

type Props = {
  // Path on greensideedge.com to load, e.g. "/dashboard".
  path: string;
};

// Renders a greensideedge.com page inside a webview with the user's
// native Supabase session handed off via /auth/mobile-handoff. The
// initial load goes through the handoff URL; subsequent in-page links
// inherit the cookies it set.
export default function WebViewScreen({ path }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    buildHandoffUrl(path).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [path]);

  if (!url) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#39c46d" />
      </View>
    );
  }

  return (
    <WebView
      source={{ uri: url }}
      style={styles.web}
      // Pull-to-refresh and back-swipe match native expectations on iOS.
      allowsBackForwardNavigationGestures
      pullToRefreshEnabled
      // Keep the in-page nav inside the webview — we only need to
      // bounce out for off-domain links (Stripe, OAuth callbacks, etc).
      onShouldStartLoadWithRequest={(req) => {
        try {
          const u = new URL(req.url);
          return u.hostname.endsWith("greensideedge.com") ||
            u.hostname.endsWith("supabase.co") ||
            u.protocol === "about:";
        } catch {
          return true;
        }
      }}
      onMessage={(_e: WebViewMessageEvent) => {
        // Reserved for native-bridge messages (e.g. "open scanner" from
        // a webview button). Wired up in Phase 2.
      }}
    />
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: "#0a1f14" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a1f14" },
});
