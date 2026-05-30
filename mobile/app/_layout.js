import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../src/lib/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: colors.bg }
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Login" }} />
        <Stack.Screen name="signup" options={{ title: "Register" }} />
        <Stack.Screen name="forgot-password" options={{ title: "Reset Password" }} />
        <Stack.Screen name="course/[id]" options={{ title: "Course Details" }} />
        <Stack.Screen name="checkout" options={{ title: "Secure Checkout" }} />
        <Stack.Screen name="learn/[batchId]" options={{ title: "Learning" }} />
        <Stack.Screen name="profile" options={{ title: "Profile" }} />
        <Stack.Screen name="contact" options={{ title: "Contact" }} />
        <Stack.Screen name="admin" options={{ title: "Admin" }} />
      </Stack>
    </>
  );
}
