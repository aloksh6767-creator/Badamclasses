import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeScreenProps } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Linking } from "react-native";
import { getCourses } from "@/api/courses";
import { Course } from "@/data/fallbackCourses";
import { MainTabParamList, RootStackParamList } from "@/navigation/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, "Live">, NativeStackScreenProps<RootStackParamList>>;

export function LiveScreen({ navigation }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    getCourses().then((items) => setCourses(items.filter((item) => item.liveClassEnabled || item.liveClassUrl))).catch(() => undefined);
  }, []);

  return (
    <Screen>
      <AppText variant="title">Live Classes</AppText>
      {courses.map((course) => (
        <Card key={course.id}>
          <AppText variant="subtitle">{course.title}</AppText>
          <AppText muted>{course.instructor} | Next live class available when batch is active.</AppText>
          <Button
            variant="secondary"
            onPress={() => course.liveClassUrl ? Linking.openURL(course.liveClassUrl) : navigation.navigate("CourseDetail", { course })}
          >
            {course.liveClassUrl ? "Open Live Stream" : "View Course"}
          </Button>
        </Card>
      ))}
      {!courses.length ? <Card><AppText muted>No live classes are scheduled right now.</AppText></Card> : null}
    </Screen>
  );
}
