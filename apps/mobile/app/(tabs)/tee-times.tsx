import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

// Tee-time booking. Budget v1: surface an aggregator/affiliate booking
// site (GolfNow by default) in a webview. Zero integration cost, earns
// referral revenue, and validates demand before investing in a native
// booking flow or direct course-inventory deals.
//
// Configure the booking URL via app.json -> extra.teeTimesUrl. Use an
// affiliate/partner link here so referrals are attributed.
const BOOKING_URL =
  (Constants.expoConfig?.extra?.teeTimesUrl as string | undefined) ||
  "https://www.golfnow.com/";

export default function TeeTimes() {
  const [reachable, setReachable] = useState<boolean | null>(null);

  useEffect(() => {
    // Cheap reachability check so we can show a clean fallback instead of
    // a blank webview if the device is offline or the host is blocked.
    let active = true;
    fetch(BOOKING_URL, { method: "HEAD" })
      .then(() => active && setReachable(true))
      .catch(() => active && setReachable(false));
    return () => {
      active = false;
    };
  }, []);

  if (reachable === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#39c46d" />
      </View>
    );
  }

  if (reachable === false) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Tee times unavailable</Text>
        <Text style={styles.body}>
          Couldn't reach the booking service. Check your connection and try again.
        </Text>
        <Pressable onPress={() => Linking.openURL(BOOKING_URL)} style={styles.cta}>
          <Text style={styles.ctaText}>Open in browser</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <WebView
        source={{ uri: BOOKING_URL }}
        style={styles.web}
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a1f14" },
  web: { flex: 1, backgroundColor: "#0a1f14" },
  centered: {
    flex: 1,
    backgroundColor: "#0a1f14",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { color: "#e8efe9", fontSize: 20, fontWeight: "700", marginBottom: 10 },
  body: { color: "#9bb0a3", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  cta: { backgroundColor: "#39c46d", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 },
  ctaText: { color: "#0a1f14", fontWeight: "700" },
});
