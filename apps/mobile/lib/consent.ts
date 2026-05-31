import AsyncStorage from "@react-native-async-storage/async-storage";

// First-launch consent for App Store / Play Store compliance. Greenside
// Edge surfaces betting information, so the stores expect an age
// affirmation (17+/18+) and responsible-gambling messaging before the
// user reaches any betting content. We persist acceptance locally so the
// gate only shows once per install.
const KEY = "gse.consent.v1";

export async function hasAcceptedConsent(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "accepted";
  } catch {
    return false;
  }
}

export async function acceptConsent(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, "accepted");
  } catch {
    // Non-fatal: worst case the gate shows again next launch.
  }
}
