import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Linking, StyleSheet, View } from "react-native";
import { RootStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { formatRupees } from "@/utils/format";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "CourseDetail">;

export function CourseDetailScreen({ route, navigation }: Props) {
  const { course } = route.params;

  return (
    <Screen>
      <Card style={styles.header}>
        <AppText variant="caption" style={styles.badge}>{course.category}</AppText>
        <AppText variant="title">{course.title}</AppText>
        <AppText muted>{course.instructor} | {course.duration}</AppText>
        <AppText style={styles.price}>{formatRupees(course.offerPrice || course.priceValue)}</AppText>
        {course.description ? <AppText muted>{course.description}</AppText> : null}
      </Card>

      <Card>
        <AppText variant="subtitle">Course Features</AppText>
        <View style={styles.list}>
          {course.highlights.map((item) => (
            <AppText key={item}>• {item}</AppText>
          ))}
        </View>
      </Card>

      <Button onPress={() => navigation.navigate("Checkout", { course })}>Enroll Now</Button>
      {course.liveClassEnabled && course.liveClassUrl ? (
        <Button variant="secondary" onPress={() => Linking.openURL(course.liveClassUrl || "")}>Open Live Class</Button>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 10
  },
  badge: {
    alignSelf: "flex-start",
    color: colors.gold
  },
  price: {
    color: colors.gold,
    fontSize: 24,
    fontWeight: "900"
  },
  list: {
    gap: 8,
    marginTop: 10
  }
});
