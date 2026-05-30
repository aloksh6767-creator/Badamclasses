import { useEffect, useMemo, useState } from "react";
import { Linking, StyleSheet, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Button, Card, Notice, Screen, Title } from "../../src/components/ui";
import { apiFetch } from "../../src/lib/api";
import { batches } from "../../src/lib/fixtures";
import { matchCourseByRoute, normalizeCourseForRoute } from "../../src/lib/courseIdentity";
import { colors } from "../../src/lib/theme";

export default function LearnScreen() {
  const { batchId } = useLocalSearchParams();
  const routeId = String(batchId || "");
  const [enrollment, setEnrollment] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    apiFetch("/enrollments/my")
      .then((items) => {
        const found = Array.isArray(items)
          ? items.find((item) => String(item.courseRouteId || item.course?._id || item.course?.routeId) === routeId)
          : null;
        setEnrollment(found || null);
      })
      .catch((error) => setNotice(error.message));
  }, [routeId]);

  const course = useMemo(() => {
    return normalizeCourseForRoute(enrollment?.course || enrollment?.courseSnapshot || matchCourseByRoute(batches, routeId) || batches[0]);
  }, [enrollment, routeId]);

  const pdfs = Array.isArray(course.pdfResources) ? course.pdfResources : [];
  const videos = Array.isArray(course.videos) ? course.videos : [];

  return (
    <Screen>
      <Title eyebrow="Learning" subtitle="Use uploaded videos, PDFs, and live-class links from the existing backend.">
        {course.title}
      </Title>
      {notice ? <Notice tone="error">{notice}</Notice> : null}
      <Card>
        <Text style={styles.heading}>Live Class</Text>
        <Text style={styles.meta}>{course.liveClassTitle || "BadamClasses Live Session"}</Text>
        <Button variant="ghost" disabled={!course.liveClassUrl} onPress={() => Linking.openURL(course.liveClassUrl)}>
          Open Live Class
        </Button>
      </Card>
      <Card style={styles.card}>
        <Text style={styles.heading}>Videos</Text>
        {videos.length ? videos.map((video, index) => (
          <Text key={`${video.title}-${index}`} style={styles.link} onPress={() => Linking.openURL(video.videoUrl)}>
            {video.title}
          </Text>
        )) : <Text style={styles.meta}>No videos uploaded yet.</Text>}
      </Card>
      <Card style={styles.card}>
        <Text style={styles.heading}>PDF Notes</Text>
        {pdfs.length ? pdfs.map((pdf, index) => (
          <Text key={`${pdf.title}-${index}`} style={styles.link} onPress={() => Linking.openURL(pdf.pdfUrl || pdf.url)}>
            {pdf.title}
          </Text>
        )) : <Text style={styles.meta}>No PDF resources uploaded yet.</Text>}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14
  },
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8
  },
  meta: {
    color: colors.soft,
    marginBottom: 12
  },
  link: {
    color: colors.cyan,
    fontWeight: "800",
    lineHeight: 30
  }
});
