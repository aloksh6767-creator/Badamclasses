import { useEffect, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import CourseCard from "../../src/components/CourseCard";
import { Screen, Title } from "../../src/components/ui";
import { apiFetch } from "../../src/lib/api";
import { batches } from "../../src/lib/fixtures";
import { normalizeCourseForRoute } from "../../src/lib/courseIdentity";
import { colors } from "../../src/lib/theme";

export default function CoursesScreen() {
  const [courses, setCourses] = useState(batches.map(normalizeCourseForRoute));
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");

  const loadCourses = async () => {
    setRefreshing(true);
    try {
      const data = await apiFetch("/courses");
      const nextCourses = Array.isArray(data) ? data.map(normalizeCourseForRoute) : [];
      setCourses(nextCourses.length ? nextCourses : batches.map(normalizeCourseForRoute));
      setNotice("");
    } catch (error) {
      setNotice(error.message);
      setCourses(batches.map(normalizeCourseForRoute));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter((course) => `${course.title} ${course.category} ${course.instructor?.name || course.instructor}`.toLowerCase().includes(term));
  }, [courses, query]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadCourses} tintColor={colors.orange} />}>
      <Title eyebrow="Courses" subtitle="Browse batches, open details, and continue to checkout.">
        Course Library
      </Title>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by course, exam, instructor"
        placeholderTextColor="#64748b"
        style={styles.search}
      />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <View style={styles.list}>
        {filtered.map((course, index) => (
          <CourseCard key={course.routeId || course.id || course.title} course={course} index={index} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.bg2,
    color: colors.text,
    paddingHorizontal: 14,
    marginBottom: 14
  },
  notice: {
    color: "#fed7aa",
    marginBottom: 12
  },
  list: {
    paddingBottom: 20
  }
});
