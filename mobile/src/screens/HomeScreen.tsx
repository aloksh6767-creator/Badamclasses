import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeScreenProps } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { getCourses } from "@/api/courses";
import { Course, homeStats } from "@/data/fallbackCourses";
import { MainTabParamList, RootStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { Button } from "@/components/Button";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { CourseCard } from "@/components/CourseCard";
import { Screen } from "@/components/Screen";

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, "Home">, NativeStackScreenProps<RootStackParamList>>;

export function HomeScreen({ navigation }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    getCourses().then(setCourses).catch(() => undefined);
  }, []);

  const featured = courses.slice(0, 3);

  return (
    <Screen>
      <Card style={styles.hero}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} resizeMode="contain" />
        <AppText variant="caption" style={styles.gold}>Badam Singh Classes 2.0</AppText>
        <AppText variant="title">New Batch Starts</AppText>
        <AppText muted>Maths, Reasoning, English aur GS ke complete live + recorded courses.</AppText>
        <View style={styles.actions}>
          <Button disabled={!featured[0]} onPress={() => featured[0] && navigation.navigate("CourseDetail", { course: featured[0] })}>Enroll Now</Button>
          <Button variant="secondary" onPress={() => navigation.navigate("MockTests")}>Try Mock Test</Button>
        </View>
      </Card>

      <View style={styles.statsGrid}>
        {homeStats.map((stat) => (
          <Card key={stat.label} style={styles.statCard}>
            <AppText variant="subtitle">{stat.value}</AppText>
            <AppText muted style={styles.statText}>{stat.label}</AppText>
          </Card>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Featured Courses</AppText>
        <Pressable onPress={() => navigation.navigate("Courses")}>
          <AppText style={styles.link}>View all</AppText>
        </Pressable>
      </View>

      {featured.map((course) => (
        <CourseCard key={course.id} course={course} onPress={() => navigation.navigate("CourseDetail", { course })} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 12,
    backgroundColor: colors.navy2
  },
  logo: {
    width: 88,
    height: 88
  },
  gold: {
    color: colors.gold
  },
  actions: {
    gap: 10
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  statCard: {
    width: "48%",
    minHeight: 92,
    justifyContent: "center"
  },
  statText: {
    fontSize: 12
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  link: {
    color: colors.orange,
    fontWeight: "900"
  }
});
