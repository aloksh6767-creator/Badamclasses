import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import CourseCard from "../../src/components/CourseCard";
import { Button, Card, Chip, Screen, Title } from "../../src/components/ui";
import { apiFetch } from "../../src/lib/api";
import { colors } from "../../src/lib/theme";
import { batches, exams } from "../../src/lib/fixtures";
import { normalizeCourseForRoute } from "../../src/lib/courseIdentity";

export default function HomeScreen() {
  const [remoteCourses, setRemoteCourses] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    apiFetch("/courses")
      .then((data) => {
        if (mounted) setRemoteCourses(Array.isArray(data) ? data.map(normalizeCourseForRoute) : []);
      })
      .catch(() => {
        if (mounted) setNotice("Backend unavailable. Showing local course preview.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const courses = useMemo(() => (remoteCourses.length ? remoteCourses : batches).slice(0, 5), [remoteCourses]);
  const featured = courses[0];

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logoRow}>
          <Image source={require("../../assets/icon.png")} style={styles.logo} />
          <Text style={styles.brand}>BadamClasses</Text>
        </View>
        <Title eyebrow="Smart Exam Prep" subtitle="Live classes, PDFs, mock tests, results, and secure course access in one mobile app.">
          Learn Smart, Achieve Success
        </Title>
        <View style={styles.heroActions}>
          <Button onPress={() => router.push("/courses")}>Explore Courses</Button>
          <Button variant="ghost" onPress={() => router.push("/login")}>Login</Button>
        </View>
      </View>

      {notice ? (
        <Card style={styles.noticeCard}>
          <Text style={styles.noticeText}>{notice}</Text>
        </Card>
      ) : null}

      <Card style={styles.featured}>
        <Text style={styles.sectionLabel}>Featured Batch</Text>
        <Text style={styles.featuredTitle}>{featured?.title}</Text>
        <Text style={styles.featuredText}>
          {featured?.description || "Structured preparation with live support, recordings, notes, and tests."}
        </Text>
        <View style={styles.chips}>
          {exams.slice(0, 4).map((exam) => (
            <Chip key={exam}>{exam}</Chip>
          ))}
        </View>
        <Button style={styles.cta} onPress={() => router.push(`/checkout?course=${encodeURIComponent(featured?.routeId || featured?.id || featured?.title)}`)}>
          Enroll Now
        </Button>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Popular Courses</Text>
        <Pressable onPress={() => router.push("/courses")}>
          <Text style={styles.viewAll}>View all</Text>
        </Pressable>
      </View>

      {courses.slice(0, 3).map((course, index) => (
        <CourseCard key={course.routeId || course.id || course.title} course={course} index={index} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 4,
    marginBottom: 10
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 12
  },
  brand: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  heroActions: {
    gap: 10
  },
  noticeCard: {
    marginBottom: 14
  },
  noticeText: {
    color: colors.soft
  },
  featured: {
    marginBottom: 20
  },
  sectionLabel: {
    color: "#fed7aa",
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    fontSize: 12
  },
  featuredTitle: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    marginTop: 8
  },
  featuredText: {
    color: colors.soft,
    marginTop: 8,
    lineHeight: 20
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14
  },
  cta: {
    marginTop: 16
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "900"
  },
  viewAll: {
    color: colors.cyan,
    fontWeight: "800"
  }
});
