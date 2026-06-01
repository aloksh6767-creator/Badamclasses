import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeScreenProps, useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { AppUser, getStoredUser } from "@/api/authStore";
import { logout } from "@/api/auth";
import { registerForPushNotifications } from "@/api/notifications";
import { MainTabParamList, RootStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, "Profile">, NativeStackScreenProps<RootStackParamList>>;

export function ProfileScreen({ navigation }: Props) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [pushStatus, setPushStatus] = useState("");

  useFocusEffect(
    useCallback(() => {
      getStoredUser().then(setUser);
    }, [])
  );

  const enablePush = async () => {
    const token = await registerForPushNotifications();
    setPushStatus(token ? "Push notifications enabled." : "Notification permission not granted.");
  };

  const signOut = async () => {
    await logout();
    setUser(null);
  };

  return (
    <Screen>
      <Card>
        <AppText variant="caption" style={{ color: colors.gold }}>Account</AppText>
        <AppText variant="title">{user?.name || "Guest Student"}</AppText>
        <AppText muted>{user?.email || "Login to sync courses, payments, and dashboard access."}</AppText>
      </Card>
      {user ? (
        <>
          <Button onPress={enablePush}>Enable Push Notifications</Button>
          {pushStatus ? <AppText muted>{pushStatus}</AppText> : null}
          <Button variant="ghost" onPress={signOut}>Logout</Button>
        </>
      ) : (
        <>
          <Button onPress={() => navigation.navigate("Login")}>Login</Button>
          <Button variant="secondary" onPress={() => navigation.navigate("Signup")}>Create Account</Button>
        </>
      )}
      <Card>
        <AppText variant="subtitle">Admin and Instructor</AppText>
        <AppText muted>Admin panel integrations remain on the backend. Role-based screens can be enabled after login by checking user.role.</AppText>
      </Card>
    </Screen>
  );
}
