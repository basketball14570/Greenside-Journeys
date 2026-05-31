import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { parseBetSlip, type ParsedBet } from "@/lib/api";

export default function ScanModal() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ParsedBet[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function capture() {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
        skipProcessing: true,
      });
      if (!photo?.base64) throw new Error("Camera returned no image data.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const { bets } = await parseBetSlip(photo.base64, "image/jpeg");
      setResult(bets);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#39c46d" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Camera access</Text>
        <Text style={styles.body}>
          Greenside Edge needs camera access to scan your bet slip and parse it into the same
          format you'd get from uploading a screenshot on the web.
        </Text>
        <Pressable onPress={requestPermission} style={styles.cta}>
          <Text style={styles.ctaText}>Allow camera</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.linkBtn}>
          <Text style={styles.link}>Cancel</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (result) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Parsed {result.length} {result.length === 1 ? "bet" : "bets"}</Text>
        <Text style={styles.body}>
          Open the Bets tab to review and save them. (In Phase 2 they'll land here natively.)
        </Text>
        <Pressable onPress={() => router.back()} style={styles.cta}>
          <Text style={styles.ctaText}>Done</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <SafeAreaView style={styles.controls} edges={["top", "bottom"]} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Scan bet slip</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.bottomBar}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            onPress={capture}
            disabled={busy}
            style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
          >
            {busy ? <ActivityIndicator color="#0a1f14" /> : <View style={styles.shutterInner} />}
          </Pressable>
          <Text style={styles.hint}>
            Frame the entire slip — players, lines, payout. Better light = better parse.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  camera: { ...StyleSheet.absoluteFillObject },
  controls: { flex: 1, justifyContent: "space-between" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  cancelText: { color: "#fff", fontSize: 15, width: 50 },
  headerTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  bottomBar: {
    alignItems: "center",
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  shutterPressed: { opacity: 0.85 },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#0a1f14",
    backgroundColor: "#fff",
  },
  hint: { color: "#e8efe9", fontSize: 12, textAlign: "center", marginTop: 12 },
  error: { color: "#ff8a82", fontSize: 13, textAlign: "center", marginBottom: 8 },
  centered: {
    flex: 1,
    backgroundColor: "#0a1f14",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { color: "#e8efe9", fontSize: 22, fontWeight: "700", marginBottom: 12 },
  body: { color: "#9bb0a3", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  cta: { backgroundColor: "#39c46d", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28 },
  ctaText: { color: "#0a1f14", fontWeight: "700" },
  linkBtn: { marginTop: 16 },
  link: { color: "#9bb0a3" },
});
