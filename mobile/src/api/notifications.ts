import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiFetch } from "./client";

export const registerForPushNotifications = async () => {
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  await apiFetch("/student/push-token", {
    method: "POST",
    body: JSON.stringify({ token: token.data, platform: Platform.OS })
  }).catch(() => undefined);

  return token.data;
};
