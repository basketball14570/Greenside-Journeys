import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

type Mode = "magic" | "password";

export default function SignIn() {
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError("Enter your email to sign in.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "magic") {
        const { error: err } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: "greensideedge://sign-in-callback" },
        });
        if (err) throw err;
        setMessage("Check your email — we sent you a sign-in link.");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.body}>
          <Text style={styles.brand}>Greenside Edge</Text>
          <Text style={styles.tagline}>The intelligence layer for golf bettors.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#5a6e62"
              style={styles.input}
            />
          </View>

          {mode === "password" ? (
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#5a6e62"
                style={styles.input}
              />
            </View>
          ) : null}

          <Pressable onPress={submit} disabled={busy} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
            {busy ? <ActivityIndicator color="#0a1f14" /> : (
              <Text style={styles.ctaText}>{mode === "magic" ? "Email me a sign-in link" : "Sign in"}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => setMode((m) => (m === "magic" ? "password" : "magic"))}>
            <Text style={styles.switchMode}>
              {mode === "magic" ? "Use a password instead" : "Email me a link instead"}
            </Text>
          </Pressable>

          {message ? <Text style={styles.message}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a1f14" },
  flex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  brand: { color: "#39c46d", fontSize: 30, fontWeight: "700", letterSpacing: -0.5 },
  tagline: { color: "#9bb0a3", fontSize: 14, marginTop: 6, marginBottom: 28 },
  field: { marginBottom: 16 },
  label: { color: "#9bb0a3", fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
  input: {
    backgroundColor: "#102e22",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#e8efe9",
    fontSize: 16,
  },
  cta: {
    marginTop: 8,
    backgroundColor: "#39c46d",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: "#0a1f14", fontWeight: "700", fontSize: 15 },
  switchMode: { color: "#9bb0a3", textAlign: "center", marginTop: 14, fontSize: 13 },
  message: { color: "#39c46d", textAlign: "center", marginTop: 18, fontSize: 13 },
  error: { color: "#e0625a", textAlign: "center", marginTop: 18, fontSize: 13 },
});
