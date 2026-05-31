import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerExpoPushToken } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Asks for permission, fetches the Expo push token, and ships it to the
// web app so the grading cron can fan out notifications to this device.
// Safe to call on every app foreground — the API upserts on the token,
// so duplicate calls are idempotent.
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulators don't get APNs / FCM tokens. Returning early avoids a
    // misleading permission prompt on the iOS simulator.
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#39c46d",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId || String(projectId).startsWith("TODO")) {
    console.warn(
      "[push] No EAS projectId yet. Run `npx eas init` inside apps/mobile to generate one, " +
        "then copy it into app.json -> extra.eas.projectId.",
    );
    return null;
  }

  const tokenResp = await Notifications.getExpoPushTokenAsync({ projectId: String(projectId) });
  const token = tokenResp.data;

  try {
    await registerExpoPushToken(token, Platform.OS === "ios" ? "ios" : "android");
  } catch (err) {
    // Don't blow up app boot if the registration call fails — log and
    // try again on next foreground.
    console.warn("[push] token registration failed", err);
  }

  return token;
}
