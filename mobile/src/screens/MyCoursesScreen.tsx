import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeScreenProps } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { getEnrollments } from "@/api/courses";
import { Course } from "@/data/fallbackCourses";
import { MainTabParamList, RootStackParamList } from "@/navigation/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { CourseCard } from "@/components/CourseCard";
import { Screen } from "@/components/Screen";
import { StateView } from "@/components/StateView";

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, "MyCourses">, NativeStackScreenProps<RootStackParamList>>;

export function MyCoursesScreen({ navigation }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getEnrollments()
        .then(setCourses)
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading) return <Screen><StateView loading title="Loading your courses" /></Screen>;

  return (
    <Screen>
      <AppText variant="title">My Courses</AppText>
      {courses.map((course) => (
        <CourseCard key={course.id || course.title} course={course} onPress={() => navigation.navigate("CourseDetail", { course })} actionLabel="Continue Learning" />
      ))}
      {!courses.length ? (
        <StateView
          title="No enrolled courses"
          message="Login and enroll in a course to see your learning dashboard here."
          actionLabel="Explore Courses"
          onAction={() => navigation.navigate("Courses")}
        />
      ) : null}
      <Button variant="ghost" onPress={() => navigation.navigate("MockTests")}>Open Mock Tests</Button>
    </Screen>
  );
}
