import { useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import CourseCard from "../../src/components/CourseCard";
import { Button, Card, Notice, Screen, Title } from "../../src/components/ui";
import { apiFetch } from "../../src/lib/api";
import { getUser, isAdminUser, logout } from "../../src/lib/auth";
import { colors } from "../../src/lib/theme";

export default function DashboardScreen() {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(null);
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    setNotice("");
    try {
      const storedUser = await getUser();
      if (!storedUser) {
        setUser(null);
        setCourses([]);
        return;
      }
      setUser(storedUser);
      const dashboard = await apiFetch("/student/dashboard");
      setStats(dashboard?.stats || null);
      setCourses(Array.isArray(dashboard?.courses) ? dashboard.courses : []);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setCourses([]);
    router.replace("/");
  };

  if (!user) {
    return (
      <Screen>
        <Title eyebrow="My Courses" subtitle="Login to see purchases, learning progress, invoices, and live classes.">
          Student Dashboard
        </Title>
        <Card>
          <Button onPress={() => router.push("/login?redirect=/dashboard")}>Login to Continue</Button>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.orange} />}>
      <Title eyebrow="My Courses" subtitle={`Welcome ${user.name || user.email}.`}>
        Dashboard
      </Title>
      {notice ? <Notice tone="error">{notice}</Notice> : null}
      <Card>
        <View style={styles.row}>
          <Text style={styles.stat}>{courses.length}</Text>
          <Text style={styles.label}>Unlocked courses</Text>
        </View>
        <Text style={styles.meta}>Progress average: {stats?.averageProgress ?? 0}%</Text>
        <View style={styles.actions}>
          <Button variant="ghost" onPress={() => router.push("/profile")}>Profile</Button>
          {isAdminUser(user) ? <Button variant="ghost" onPress={() => router.push("/admin")}>Admin</Button> : null}
          <Button variant="ghost" onPress={handleLogout}>Logout</Button>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Enrolled Courses</Text>
      {courses.length ? (
        courses.map((item, index) => (
          <Pressable key={item._id || item.courseRouteId || index} onPress={() => router.push(`/learn/${encodeURIComponent(item.courseRouteId || item.course?._id || item.course?.routeId)}`)}>
            <CourseCard course={item.course || item.courseSnapshot || item} index={index} purchased />
          </Pressable>
        ))
      ) : (
        <Card>
          <Text style={styles.meta}>No course unlocked yet.</Text>
          <Button style={styles.explore} onPress={() => router.push("/courses")}>Explore Courses</Button>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10
  },
  stat: {
    color: colors.orange2,
    fontSize: 34,
    fontWeight: "900"
  },
  label: {
    color: colors.text,
    fontWeight: "800"
  },
  meta: {
    color: colors.soft,
    marginTop: 8
  },
  actions: {
    gap: 10,
    marginTop: 16
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginVertical: 16
  },
  explore: {
    marginTop: 14
  }
});
