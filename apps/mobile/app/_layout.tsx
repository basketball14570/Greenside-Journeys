import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/lib/auth";
import { registerForPush } from "@/lib/push";
import { acceptConsent, hasAcceptedConsent } from "@/lib/consent";
import AgeGate from "@/components/AgeGate";

function RouteGuard() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) router.replace("/(auth)/sign-in");
    else if (session && inAuthGroup) router.replace("/(tabs)");
  }, [session, loading, segments, router]);

  useEffect(() => {
    if (session) {
      // Fire and forget — registration logs its own warnings.
      registerForPush().catch(() => {});
    }
  }, [session]);

  return null;
}

export default function RootLayout() {
  // Consent gate (age + responsible gambling) blocks all content until
  // accepted, satisfying the app stores' betting-content requirements.
  // `null` = still loading the stored flag; show nothing to avoid a flash.
  const [consented, setConsented] = useState<boolean | null>(null);

  useEffect(() => {
    hasAcceptedConsent().then(setConsented);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0a1f14" }}>
      <StatusBar style="light" />
      {consented === null ? (
        <View style={{ flex: 1, backgroundColor: "#0a1f14" }} />
      ) : !consented ? (
        <AgeGate
          onAccept={() => {
            acceptConsent();
            setConsented(true);
          }}
        />
      ) : (
        <AuthProvider>
          <RouteGuard />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0a1f14" } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="scan" options={{ presentation: "modal" }} />
          </Stack>
        </AuthProvider>
      )}
    </GestureHandlerRootView>
  );
}
