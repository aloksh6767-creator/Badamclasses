import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text } from "react-native";
import { Button, Card, Field, Notice, Screen, Title } from "../src/components/ui";
import { apiFetch, getApiUrl } from "../src/lib/api";
import { getToken, getUser, setStoredUser } from "../src/lib/auth";
import { registerForPushNotifications } from "../src/lib/notifications";
import { colors } from "../src/lib/theme";

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", currentPassword: "", newPassword: "" });
  const [enrollments, setEnrollments] = useState([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    (async () => {
      const stored = await getUser();
      setUser(stored);
      setForm((current) => ({ ...current, name: stored?.name || "", email: stored?.email || "" }));
      apiFetch("/enrollments/my")
        .then((items) => setEnrollments(Array.isArray(items) ? items : []))
        .catch(() => {});
    })();
  }, []);

  const save = async () => {
    setLoading(true);
    setNotice("");
    try {
      const result = await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(form)
      });
      if (result?.user) {
        await setStoredUser(result.user);
        setUser(result.user);
      }
      setNotice(result?.message || "Profile updated.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const invoice = async (id) => {
    const token = await getToken();
    const url = `${getApiUrl(`/enrollments/${id}/invoice`)}?token=${encodeURIComponent(token || "")}`;
    Linking.openURL(url);
  };

  const enableNotifications = async () => {
    const result = await registerForPushNotifications();
    setNotice(result.message || (result.token ? "Push notifications enabled." : "Unable to enable notifications."));
  };

  if (!user) {
    return (
      <Screen>
        <Title eyebrow="Profile">Login required</Title>
        <Card><Text style={styles.meta}>Please login to manage your profile.</Text></Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title eyebrow="Account" subtitle={user.email}>
        Profile
      </Title>
      {notice ? <Notice>{notice}</Notice> : null}
      <Card>
        <Field label="Name" value={form.name} onChangeText={update("name")} placeholder="Name" />
        <Field label="Email" value={form.email} onChangeText={update("email")} placeholder="Email" keyboardType="email-address" />
        <Field label="Current password" value={form.currentPassword} onChangeText={update("currentPassword")} placeholder="Required for password change" secureTextEntry />
        <Field label="New password" value={form.newPassword} onChangeText={update("newPassword")} placeholder="Optional" secureTextEntry />
        <Button loading={loading} onPress={save}>Save Profile</Button>
        <Button variant="ghost" style={styles.notify} onPress={enableNotifications}>Enable Push Notifications</Button>
      </Card>
      <Text style={styles.heading}>Invoices</Text>
      {enrollments.map((item) => (
        <Card key={item._id} style={styles.card}>
          <Text style={styles.title}>{item.courseTitle || item.course?.title || "Course"}</Text>
          <Button variant="ghost" onPress={() => invoice(item._id)}>Open Invoice</Button>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginVertical: 16
  },
  card: {
    marginBottom: 12
  },
  title: {
    color: colors.text,
    fontWeight: "900",
    marginBottom: 10
  },
  meta: {
    color: colors.soft
  },
  notify: {
    marginTop: 12
  }
});
