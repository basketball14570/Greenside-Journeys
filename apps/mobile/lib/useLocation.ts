import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import type { LatLng } from "./geo";

export type LocationState = {
  coords: LatLng | null;
  // Horizontal accuracy in meters as reported by the OS. Surfaced so the
  // rangefinder can warn the golfer when GPS is too rough to trust.
  accuracyM: number | null;
  status: "idle" | "requesting" | "watching" | "denied" | "error";
  error: string | null;
};

// Subscribes to the device GPS while the rangefinder is on screen. Uses
// BestForNavigation accuracy with a 1s / 1m cadence — tight enough to
// feel live as the golfer walks up to the ball, loose enough not to
// hammer the battery. The watcher is torn down on unmount.
export function useLocation(active: boolean): LocationState {
  const [state, setState] = useState<LocationState>({
    coords: null,
    accuracyM: null,
    status: "idle",
    error: null,
  });
  const subRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setState((s) => ({ ...s, status: "requesting" }));
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== "granted") {
        setState((s) => ({ ...s, status: "denied", error: "Location permission denied." }));
        return;
      }
      try {
        subRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (pos) => {
            setState({
              coords: { lat: pos.coords.latitude, lon: pos.coords.longitude },
              accuracyM: pos.coords.accuracy ?? null,
              status: "watching",
              error: null,
            });
          },
        );
      } catch (e) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            status: "error",
            error: e instanceof Error ? e.message : "Could not read GPS.",
          }));
        }
      }
    }

    if (active) start();

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [active]);

  return state;
}
