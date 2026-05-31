import { Tabs, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 4 }}>
      <Text
        style={{
          color: focused ? "#39c46d" : "#5a6e62",
          fontSize: 11,
          fontWeight: focused ? "700" : "500",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// Header "Scan" shortcut — only meaningful on the betting screens.
function ScanButton() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push("/scan")} hitSlop={12} style={{ paddingRight: 16 }}>
      <Text style={{ color: "#39c46d", fontWeight: "700" }}>Scan</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0a1f14" },
        headerTitleStyle: { color: "#e8efe9", fontWeight: "700" },
        headerTintColor: "#39c46d",
        tabBarStyle: {
          backgroundColor: "#0a1f14",
          borderTopColor: "#102e22",
          height: 64,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Command Center",
          headerRight: () => <ScanButton />,
          tabBarIcon: ({ focused }) => <TabIcon label="Command" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bets"
        options={{
          title: "Live Bets",
          headerRight: () => <ScanButton />,
          tabBarIcon: ({ focused }) => <TabIcon label="Live" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="play"
        options={{
          // Play renders its own full-screen chrome.
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon label="Play" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tee-times"
        options={{
          title: "Tee Times",
          tabBarIcon: ({ focused }) => <TabIcon label="Tee Times" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "You",
          tabBarIcon: ({ focused }) => <TabIcon label="You" focused={focused} />,
        }}
      />
      {/* Betting pages reachable from the Command Center's own nav and
          from the You tab's quick links — kept as routes, hidden from
          the bar to keep it to five items. */}
      <Tabs.Screen name="leaderboard" options={{ href: null, title: "Leaderboard" }} />
      <Tabs.Screen name="guide" options={{ href: null, title: "Course Guide" }} />
    </Tabs>
  );
}
