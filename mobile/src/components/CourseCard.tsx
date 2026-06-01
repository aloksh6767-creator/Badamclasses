import { Pressable, StyleSheet, View } from "react-native";
import { Course } from "@/data/fallbackCourses";
import { colors } from "@/theme/colors";
import { formatRupees } from "@/utils/format";
import { AppText } from "./AppText";
import { Card } from "./Card";

type Props = {
  course: Course;
  onPress: () => void;
  actionLabel?: string;
};

export function CourseCard({ course, onPress, actionLabel = "View Course" }: Props) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.card, pressed && styles.pressed]}>
          <View style={styles.topRow}>
            <View style={styles.badge}>
              <AppText variant="caption">{course.category}</AppText>
            </View>
            <AppText style={styles.price}>{formatRupees(course.offerPrice || course.priceValue)}</AppText>
          </View>
          <AppText variant="subtitle">{course.title}</AppText>
          <AppText muted>{course.instructor} | {course.duration}</AppText>
          <View style={styles.highlights}>
            {course.highlights.slice(0, 3).map((item) => (
              <View key={item} style={styles.chip}>
                <AppText style={styles.chipText}>{item}</AppText>
              </View>
            ))}
          </View>
          <AppText style={styles.action}>{actionLabel}</AppText>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10
  },
  pressed: {
    opacity: 0.88
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(249,115,22,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  price: {
    color: colors.gold,
    fontWeight: "900"
  },
  highlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  chipText: {
    fontSize: 12,
    color: colors.muted
  },
  action: {
    color: colors.orange,
    fontWeight: "900"
  }
});
