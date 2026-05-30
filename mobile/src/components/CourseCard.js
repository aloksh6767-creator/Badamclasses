import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Card, Chip } from "./ui";
import { colors } from "../lib/theme";
import { normalizeCourseForRoute } from "../lib/courseIdentity";

export default function CourseCard({ course, index = 0, purchased = false }) {
  const item = normalizeCourseForRoute(course, index);
  const price = Number(item.priceValue || item.offerPrice || item.price || 0);

  return (
    <Pressable onPress={() => router.push(`/course/${encodeURIComponent(item.routeId)}`)}>
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <Chip>{item.category || "Course"}</Chip>
          {purchased ? <Chip>Unlocked</Chip> : null}
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>Instructor: {item.instructor?.name || item.instructor || "BadamClasses"}</Text>
        <Text style={styles.meta}>Duration: {item.duration || "Flexible"}</Text>
        <View style={styles.bottomRow}>
          <Text style={styles.price}>{price ? `₹${price.toLocaleString("en-IN")}` : "Free"}</Text>
          <Text style={styles.link}>{purchased ? "Start" : "View"}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12
  },
  title: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "900"
  },
  meta: {
    color: colors.soft,
    marginTop: 6
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14
  },
  price: {
    color: "#fed7aa",
    fontSize: 22,
    fontWeight: "900"
  },
  link: {
    color: colors.cyan,
    fontWeight: "800"
  }
});
