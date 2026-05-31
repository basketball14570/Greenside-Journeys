import Constants from "expo-constants";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const { session } = useAuth();
  const email = session?.user?.email ?? "Not signed in";
  const version = Constants.expoConfig?.version ?? "0.1.0";

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Section title="Account">
          <Row label="Email" value={email} />
          <Row label="User ID" value={session?.user?.id ?? "—"} mono />
        </Section>

        <Section title="App">
          <Row label="Version" value={version} />
          <Row label="Bundle" value="com.greensideedge.app" mono />
        </Section>

        <Pressable
          onPress={signOut}
          style={({ pressed }) => [styles.danger, pressed && styles.dangerPressed]}
        >
          <Text style={styles.dangerText}>Sign out</Text>
        </Pressable>

        <Text style={styles.footer}>
          More native screens coming in Phase 2. Today the Dashboard, Bets, and Leaderboard tabs
          load greensideedge.com inside a webview with your session pre-authenticated.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.mono]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a1f14" },
  body: { padding: 20, paddingBottom: 60 },
  section: { marginBottom: 24 },
  sectionTitle: {
    color: "#9bb0a3",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  card: { backgroundColor: "#102e22", borderRadius: 12, paddingHorizontal: 14 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#0a1f14",
  },
  rowLabel: { color: "#9bb0a3", fontSize: 14 },
  rowValue: { color: "#e8efe9", fontSize: 14, flexShrink: 1, marginLeft: 12 },
  mono: { fontFamily: "Menlo", fontSize: 12 },
  danger: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0625a",
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerPressed: { opacity: 0.7 },
  dangerText: { color: "#e0625a", fontWeight: "700" },
  footer: { color: "#5a6e62", fontSize: 12, marginTop: 24, lineHeight: 18 },
});
