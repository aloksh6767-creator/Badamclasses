import { useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text } from "react-native";
import { Button, Card, Field, Notice, Screen, Title } from "../src/components/ui";
import { apiFetch } from "../src/lib/api";
import { getUser, isAdminUser } from "../src/lib/auth";
import { colors } from "../src/lib/theme";

const emptyCourse = {
  title: "",
  description: "",
  price: "",
  category: "SSC",
  duration: "",
  batchTime: "",
  startDate: ""
};

export default function AdminScreen() {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [health, setHealth] = useState(null);
  const [automation, setAutomation] = useState(null);
  const [form, setForm] = useState(emptyCourse);
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const load = async () => {
    setRefreshing(true);
    setNotice("");
    try {
      const stored = await getUser();
      setUser(stored);
      if (!isAdminUser(stored)) return;
      const [courseData, dashboard] = await Promise.all([
        apiFetch("/instructor/courses"),
        apiFetch("/automation/dashboard").catch(() => null)
      ]);
      setCourses(Array.isArray(courseData) ? courseData : []);
      setHealth(dashboard?.health || null);
      setAutomation(dashboard || null);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createCourse = async () => {
    setNotice("");
    try {
      await apiFetch("/instructor/courses", {
        method: "POST",
        body: JSON.stringify({ ...form, price: Number(form.price || 0) })
      });
      setForm(emptyCourse);
      setNotice("Course created.");
      load();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const runBackup = async () => {
    try {
      const result = await apiFetch("/automation/backups/run", { method: "POST" });
      setNotice(result?.message || "Backup created.");
    } catch (error) {
      setNotice(error.message);
    }
  };

  if (!isAdminUser(user)) {
    return (
      <Screen>
        <Title eyebrow="Admin">Admin access required</Title>
        <Card><Text style={styles.meta}>Login with an admin or instructor account to manage app content.</Text></Card>
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.orange} />}>
      <Title eyebrow="Admin" subtitle="Compact mobile controls for core course and automation operations.">
        Admin Workspace
      </Title>
      {notice ? <Notice>{notice}</Notice> : null}
      <Card>
        <Text style={styles.heading}>System Health</Text>
        <Text style={styles.meta}>Database: {health?.database || "unknown"}</Text>
        <Text style={styles.meta}>Razorpay: {health?.payment?.razorpayConfigured ? "configured" : "unknown"}</Text>
        <Text style={styles.meta}>Pending approvals: {automation?.pending?.length ?? 0}</Text>
        <Button style={styles.action} variant="ghost" onPress={runBackup}>Run Backup</Button>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.heading}>Create Course</Text>
        <Field label="Title" value={form.title} onChangeText={update("title")} placeholder="Course title" />
        <Field label="Description" value={form.description} onChangeText={update("description")} placeholder="Short description" multiline />
        <Field label="Price" value={String(form.price)} onChangeText={update("price")} placeholder="999" keyboardType="number-pad" />
        <Field label="Category" value={form.category} onChangeText={update("category")} placeholder="SSC" />
        <Field label="Duration" value={form.duration} onChangeText={update("duration")} placeholder="12 Months" />
        <Button disabled={!form.title || !form.description || !form.price} onPress={createCourse}>Create Course</Button>
      </Card>

      <Text style={styles.section}>Courses</Text>
      {courses.map((course) => (
        <Card key={course._id || course.title} style={styles.card}>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.meta}>₹{Number(course.price || 0).toLocaleString("en-IN")} • {course.category || "General"}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8
  },
  meta: {
    color: colors.soft,
    marginTop: 6
  },
  action: {
    marginTop: 14
  },
  card: {
    marginTop: 14
  },
  section: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginVertical: 16
  },
  courseTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  }
});
