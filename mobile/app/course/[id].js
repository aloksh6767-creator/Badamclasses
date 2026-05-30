import { useEffect, useMemo, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Card, Chip, Notice, Screen, Title } from "../../src/components/ui";
import { apiFetch } from "../../src/lib/api";
import { batches } from "../../src/lib/fixtures";
import { matchCourseByRoute, normalizeCourseForRoute } from "../../src/lib/courseIdentity";
import { colors } from "../../src/lib/theme";

export default function CourseDetailsScreen() {
  const { id } = useLocalSearchParams();
  const routeId = String(id || "");
  const [remoteCourse, setRemoteCourse] = useState(null);
  const [enrolled, setEnrolled] = useState(false);
  const [notice] = useState("");

  useEffect(() => {
    let mounted = true;
    apiFetch(`/courses/${encodeURIComponent(routeId)}`)
      .then((data) => {
        if (mounted) setRemoteCourse(normalizeCourseForRoute(data));
      })
      .catch(() => {});

    apiFetch("/enrollments/my")
      .then((items) => {
        if (!mounted) return;
        const match = Array.isArray(items)
          ? items.some((item) => String(item.courseRouteId || item.course?._id || item.course?.routeId) === routeId)
          : false;
        setEnrolled(match);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [routeId]);

  const course = useMemo(() => {
    return remoteCourse || normalizeCourseForRoute(matchCourseByRoute(batches, routeId) || batches[0]);
  }, [remoteCourse, routeId]);

  const price = Number(course.priceValue || course.offerPrice || course.price || 0);
  const highlights = Array.isArray(course.highlights) ? course.highlights : [];
  const pdfs = Array.isArray(course.pdfResources) ? course.pdfResources : [];
  const videos = Array.isArray(course.videos) ? course.videos : [];

  return (
    <Screen>
      <Title eyebrow={course.category || "Course"} subtitle={course.description || "Structured course with live, recorded, and PDF learning support."}>
        {course.title}
      </Title>
      {notice ? <Notice>{notice}</Notice> : null}
      <Card>
        <View style={styles.row}>
          <Chip>{course.duration || "Flexible"}</Chip>
          <Chip>{course.instructor?.name || course.instructor || "BadamClasses"}</Chip>
        </View>
        <Text style={styles.price}>{price ? `₹${price.toLocaleString("en-IN")}` : "Free"}</Text>
        <Button
          onPress={() =>
            enrolled
              ? router.push(`/learn/${encodeURIComponent(course.routeId || course._id || course.id)}`)
              : router.push(`/checkout?course=${encodeURIComponent(course.routeId || course._id || course.id || course.title)}`)
          }
        >
          {enrolled ? "Start Learning" : "Proceed to Pay"}
        </Button>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.heading}>What you get</Text>
        {(highlights.length ? highlights : ["Live support", "PDF notes", "Mock tests", "Progress tracking"]).map((item) => (
          <Text key={item} style={styles.bullet}>• {item}</Text>
        ))}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.heading}>Learning Content</Text>
        {videos.length || pdfs.length ? null : <Text style={styles.muted}>Content will appear here after admin uploads it.</Text>}
        {videos.map((video, index) => (
          <Text key={`${video.title}-${index}`} style={styles.link} onPress={() => Linking.openURL(video.videoUrl)}>
            Watch: {video.title}
          </Text>
        ))}
        {pdfs.map((pdf, index) => (
          <Text key={`${pdf.title}-${index}`} style={styles.link} onPress={() => Linking.openURL(pdf.pdfUrl || pdf.url)}>
            PDF: {pdf.title}
          </Text>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14
  },
  price: {
    color: "#fed7aa",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 16
  },
  section: {
    marginTop: 14
  },
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8
  },
  bullet: {
    color: colors.soft,
    lineHeight: 24
  },
  muted: {
    color: colors.muted,
    lineHeight: 22
  },
  link: {
    color: colors.cyan,
    fontWeight: "800",
    lineHeight: 28
  }
});
