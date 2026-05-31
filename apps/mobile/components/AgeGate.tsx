import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Shown once on first launch before any betting content. Affirms the
// user is of legal age and surfaces responsible-gambling resources — a
// review requirement for betting-adjacent apps on both stores. Greenside
// Edge tracks bets placed elsewhere; it is not a sportsbook and takes no
// wagers, which is the messaging that keeps it in the allowed category.
export default function AgeGate({ onAccept }: { onAccept: () => void }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.logo}>Greenside Edge</Text>
        <Text style={styles.h1}>Before you start</Text>

        <Text style={styles.p}>
          Greenside Edge is a bet-tracking and golf intelligence tool. It helps you track and
          analyze bets you place elsewhere — it is <Text style={styles.bold}>not a sportsbook</Text>,
          and you cannot wager real money in this app.
        </Text>

        <Text style={styles.p}>
          You must be of legal age to view betting content in your jurisdiction (18+ or 21+ where
          required).
        </Text>

        <Pressable style={styles.check} onPress={() => setConfirmed((c) => !c)}>
          <View style={[styles.box, confirmed && styles.boxOn]}>
            {confirmed ? <Text style={styles.tick}>✓</Text> : null}
          </View>
          <Text style={styles.checkLabel}>
            I confirm I am of legal age and understand this app does not accept wagers.
          </Text>
        </Pressable>

        <View style={styles.rg}>
          <Text style={styles.rgTitle}>Gamble responsibly</Text>
          <Text style={styles.rgText}>
            If gambling stops being fun, help is available 24/7. Call or text 1-800-GAMBLER.
          </Text>
          <Pressable onPress={() => Linking.openURL("https://www.1800gambler.net/")}>
            <Text style={styles.rgLink}>1800gambler.net</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onAccept}
          disabled={!confirmed}
          style={[styles.cta, !confirmed && styles.ctaOff]}
        >
          <Text style={[styles.ctaText, !confirmed && styles.ctaTextOff]}>Continue</Text>
        </Pressable>

        <Text style={styles.legal}>
          By continuing you agree to our{" "}
          <Text style={styles.legalLink} onPress={() => Linking.openURL("https://greensideedge.com/terms")}>
            Terms
          </Text>{" "}
          and{" "}
          <Text style={styles.legalLink} onPress={() => Linking.openURL("https://greensideedge.com/privacy")}>
            Privacy Policy
          </Text>
          .
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a1f14" },
  body: { padding: 24, paddingTop: 40 },
  logo: { color: "#39c46d", fontSize: 13, letterSpacing: 2, textTransform: "uppercase", fontWeight: "700" },
  h1: { color: "#e8efe9", fontSize: 28, fontWeight: "800", marginTop: 10, marginBottom: 20 },
  p: { color: "#9bb0a3", fontSize: 15, lineHeight: 22, marginBottom: 16 },
  bold: { color: "#e8efe9", fontWeight: "700" },
  check: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 4, marginBottom: 8 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#5a6e62",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxOn: { backgroundColor: "#39c46d", borderColor: "#39c46d" },
  tick: { color: "#0a1f14", fontWeight: "900", fontSize: 15 },
  checkLabel: { color: "#e8efe9", fontSize: 14, flex: 1, lineHeight: 20 },
  rg: { backgroundColor: "#102e22", borderRadius: 12, padding: 16, marginTop: 20, marginBottom: 24 },
  rgTitle: { color: "#e8efe9", fontWeight: "700", fontSize: 14, marginBottom: 6 },
  rgText: { color: "#9bb0a3", fontSize: 13, lineHeight: 19 },
  rgLink: { color: "#39c46d", fontSize: 13, marginTop: 8, fontWeight: "600" },
  cta: { backgroundColor: "#39c46d", borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  ctaOff: { backgroundColor: "#1c3a2a" },
  ctaText: { color: "#0a1f14", fontWeight: "800", fontSize: 16 },
  ctaTextOff: { color: "#5a6e62" },
  legal: { color: "#5a6e62", fontSize: 12, textAlign: "center", marginTop: 18, lineHeight: 18 },
  legalLink: { color: "#9bb0a3", textDecorationLine: "underline" },
});
