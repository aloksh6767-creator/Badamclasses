import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeScreenProps } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { getCourses } from "@/api/courses";
import { Course } from "@/data/fallbackCourses";
import { MainTabParamList, RootStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { AppText } from "@/components/AppText";
import { CourseCard } from "@/components/CourseCard";
import { Screen } from "@/components/Screen";
import { StateView } from "@/components/StateView";

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, "Courses">, NativeStackScreenProps<RootStackParamList>>;

export function CoursesScreen({ navigation }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCourses()
      .then(setCourses)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return courses;
    return courses.filter((course) => `${course.title} ${course.category} ${course.instructor}`.toLowerCase().includes(search));
  }, [courses, query]);

  if (loading) return <Screen><StateView loading title="Loading courses" /></Screen>;

  return (
    <Screen>
      <AppText variant="title">Courses</AppText>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search courses"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      {filtered.map((course) => (
        <CourseCard key={course.id} course={course} onPress={() => navigation.navigate("CourseDetail", { course })} actionLabel="Open Details" />
      ))}
      {!filtered.length ? <StateView title="No courses found" message="Try a different search." /> : null}
      <Pressable onPress={() => navigation.navigate("MockTests")}>
        <AppText style={styles.mockLink}>Open free mock tests</AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.navy2,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 15
  },
  mockLink: {
    color: colors.orange,
    fontWeight: "900",
    textAlign: "center",
    padding: 12
  }
});
