import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { distanceYards, type LatLng } from "@/lib/geo";
import {
  getCourse,
  isSampleMode,
  searchCourses,
  type Course,
  type CourseSummary,
} from "@/lib/courses";
import { useLocation } from "@/lib/useLocation";

// On-course GPS rangefinder. Budget build: device GPS via expo-location
// + green coordinates from the course-data layer, distances computed
// locally. No server, no key. Runs on the bundled sample course until a
// course API is configured (see lib/courses.ts).
export default function Play() {
  const [course, setCourse] = useState<Course | null>(null);

  if (!course) return <CoursePicker onPick={setCourse} />;
  return <Rangefinder course={course} onExit={() => setCourse(null)} />;
}

function CoursePicker({ onPick }: { onPick: (c: Course) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await searchCourses(query);
        if (active) setResults(r);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Search failed.");
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  async function pick(id: string) {
    setLoading(true);
    try {
      const c = await getCourse(id);
      if (c) onPick(c);
      else setError("Course has no mapped green data yet.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load course.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <View style={styles.pickerBody}>
        <Text style={styles.h1}>Play a round</Text>
        {isSampleMode() ? (
          <Text style={styles.sampleNote}>
            Demo mode — showing the bundled sample course. Configure a course API in app.json to
            search all courses.
          </Text>
        ) : null}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search courses…"
          placeholderTextColor="#5a6e62"
          style={styles.search}
          autoCorrect={false}
        />
        {loading ? <ActivityIndicator color="#39c46d" style={{ marginTop: 16 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <FlatList
          data={results}
          keyExtractor={(c) => c.id}
          style={{ marginTop: 12 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => pick(item.id)} style={styles.courseRow}>
              <Text style={styles.courseName}>{item.name}</Text>
              {item.city ? <Text style={styles.courseCity}>{item.city}</Text> : null}
            </Pressable>
          )}
          ListEmptyComponent={
            !loading ? <Text style={styles.empty}>No courses found.</Text> : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

function Rangefinder({ course, onExit }: { course: Course; onExit: () => void }) {
  const [holeIdx, setHoleIdx] = useState(0);
  const loc = useLocation(true);
  const hole = course.holes[holeIdx];

  const distances = useMemo(() => {
    if (!loc.coords) return null;
    const me: LatLng = loc.coords;
    const d = (p?: LatLng) => (p ? distanceYards(me, p) : null);
    return {
      front: d(hole.green.front),
      center: d(hole.green.center),
      back: d(hole.green.back),
    };
  }, [loc.coords, hole]);

  const accuracyWarn = loc.accuracyM != null && loc.accuracyM > 10;

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <View style={styles.rfHeader}>
        <Pressable onPress={onExit} hitSlop={10}>
          <Text style={styles.exit}>Done</Text>
        </Pressable>
        <Text style={styles.rfCourse} numberOfLines={1}>
          {course.name}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.holeBar}>
        <Pressable
          onPress={() => setHoleIdx((i) => Math.max(0, i - 1))}
          disabled={holeIdx === 0}
          style={[styles.holeNav, holeIdx === 0 && styles.holeNavDisabled]}
        >
          <Text style={styles.holeNavText}>‹</Text>
        </Pressable>
        <View style={styles.holeMeta}>
          <Text style={styles.holeNum}>Hole {hole.number}</Text>
          <Text style={styles.holePar}>{hole.par ? `Par ${hole.par}` : "—"}</Text>
        </View>
        <Pressable
          onPress={() => setHoleIdx((i) => Math.min(course.holes.length - 1, i + 1))}
          disabled={holeIdx >= course.holes.length - 1}
          style={[styles.holeNav, holeIdx >= course.holes.length - 1 && styles.holeNavDisabled]}
        >
          <Text style={styles.holeNavText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.distWrap}>
        {!loc.coords ? (
          <View style={styles.acquiring}>
            <ActivityIndicator color="#39c46d" />
            <Text style={styles.acquiringText}>
              {loc.status === "denied"
                ? "Location permission denied — enable it in Settings to use the rangefinder."
                : "Acquiring GPS…"}
            </Text>
          </View>
        ) : (
          <>
            <DistanceRow label="Back" yards={distances?.back ?? null} dim />
            <DistanceRow label="Center" yards={distances?.center ?? null} big />
            <DistanceRow label="Front" yards={distances?.front ?? null} dim />
          </>
        )}
      </View>

      <View style={styles.footer}>
        {loc.accuracyM != null ? (
          <Text style={[styles.accuracy, accuracyWarn && styles.accuracyWarn]}>
            GPS ±{Math.round(loc.accuracyM)}m{accuracyWarn ? " — move to open sky for accuracy" : ""}
          </Text>
        ) : null}
        {course.source === "sample" ? (
          <Text style={styles.sampleFoot}>Sample course — distances are illustrative.</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function DistanceRow({
  label,
  yards,
  big,
  dim,
}: {
  label: string;
  yards: number | null;
  big?: boolean;
  dim?: boolean;
}) {
  return (
    <View style={styles.distRow}>
      <Text style={[styles.distLabel, dim && styles.distLabelDim]}>{label}</Text>
      <Text style={[styles.distValue, big && styles.distValueBig, dim && styles.distValueDim]}>
        {yards == null ? "—" : yards}
        <Text style={styles.distUnit}>{yards == null ? "" : " yd"}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a1f14" },
  pickerBody: { flex: 1, padding: 20 },
  h1: { color: "#e8efe9", fontSize: 24, fontWeight: "700", marginBottom: 8 },
  sampleNote: { color: "#9bb0a3", fontSize: 12, marginBottom: 12, lineHeight: 17 },
  search: {
    backgroundColor: "#102e22",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#e8efe9",
    fontSize: 16,
  },
  courseRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#102e22" },
  courseName: { color: "#e8efe9", fontSize: 16 },
  courseCity: { color: "#5a6e62", fontSize: 13, marginTop: 2 },
  empty: { color: "#5a6e62", textAlign: "center", marginTop: 24 },
  error: { color: "#e0625a", marginTop: 12 },

  rfHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  exit: { color: "#39c46d", fontWeight: "700", fontSize: 15, width: 44 },
  rfCourse: { color: "#e8efe9", fontSize: 15, fontWeight: "600", flex: 1, textAlign: "center" },
  holeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  holeNav: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#102e22",
    alignItems: "center",
    justifyContent: "center",
  },
  holeNavDisabled: { opacity: 0.4 },
  holeNavText: { color: "#39c46d", fontSize: 28, lineHeight: 30 },
  holeMeta: { alignItems: "center" },
  holeNum: { color: "#e8efe9", fontSize: 20, fontWeight: "700" },
  holePar: { color: "#9bb0a3", fontSize: 14, marginTop: 2 },

  distWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  distRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  distLabel: { color: "#e8efe9", fontSize: 18, fontWeight: "600" },
  distLabelDim: { color: "#9bb0a3", fontSize: 15 },
  distValue: { color: "#e8efe9", fontSize: 44, fontWeight: "800" },
  distValueBig: { color: "#39c46d", fontSize: 88 },
  distValueDim: { fontSize: 36, color: "#9bb0a3" },
  distUnit: { fontSize: 18, fontWeight: "600", color: "#5a6e62" },

  acquiring: { alignItems: "center", gap: 12 },
  acquiringText: { color: "#9bb0a3", textAlign: "center", paddingHorizontal: 32, lineHeight: 20 },

  footer: { paddingHorizontal: 24, paddingBottom: 8, gap: 4 },
  accuracy: { color: "#5a6e62", fontSize: 12, textAlign: "center" },
  accuracyWarn: { color: "#d99a3a" },
  sampleFoot: { color: "#5a6e62", fontSize: 11, textAlign: "center" },
});
