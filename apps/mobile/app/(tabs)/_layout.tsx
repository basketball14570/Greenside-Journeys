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

export default function TabsLayout() {
  const router = useRouter();
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
        headerRight: () => (
          <Pressable
            onPress={() => router.push("/scan")}
            hitSlop={12}
            style={{ paddingRight: 16 }}
          >
            <Text style={{ color: "#39c46d", fontWeight: "700" }}>Scan</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bets"
        options={{
          title: "Bets",
          tabBarIcon: ({ focused }) => <TabIcon label="Bets" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
          tabBarIcon: ({ focused }) => <TabIcon label="Board" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => <TabIcon label="You" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
