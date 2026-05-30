import { Tabs } from "expo-router";
import { colors } from "../../src/lib/theme";

const tabOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: "800" },
  tabBarStyle: {
    backgroundColor: colors.bg2,
    borderTopColor: colors.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8
  },
  tabBarActiveTintColor: colors.orange2,
  tabBarInactiveTintColor: colors.muted,
  tabBarLabelStyle: { fontSize: 11, fontWeight: "700" }
};

export default function TabsLayout() {
  return (
    <Tabs screenOptions={tabOptions}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: () => null }} />
      <Tabs.Screen name="courses" options={{ title: "Courses", tabBarIcon: () => null }} />
      <Tabs.Screen name="mock-tests" options={{ title: "Tests", tabBarIcon: () => null }} />
      <Tabs.Screen name="results" options={{ title: "Results", tabBarIcon: () => null }} />
      <Tabs.Screen name="dashboard" options={{ title: "My Courses", tabBarIcon: () => null }} />
    </Tabs>
  );
}
