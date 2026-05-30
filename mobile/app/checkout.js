import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Button, Card, Chip, Notice, Screen, Title } from "../src/components/ui";
import { apiFetch } from "../src/lib/api";
import { getToken, getUser } from "../src/lib/auth";
import { batches } from "../src/lib/fixtures";
import { matchCourseByRoute, normalizeCourseForRoute } from "../src/lib/courseIdentity";
import { colors } from "../src/lib/theme";

export default function CheckoutScreen() {
  const { course: courseParam } = useLocalSearchParams();
  const courseKey = String(courseParam || "");
  const [remoteCourses, setRemoteCourses] = useState([]);
  const [option, setOption] = useState("qr");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [qrSession, setQrSession] = useState(null);

  useEffect(() => {
    apiFetch("/courses")
      .then((data) => setRemoteCourses(Array.isArray(data) ? data.map(normalizeCourseForRoute) : []))
      .catch(() => {});
  }, []);

  const course = useMemo(() => {
    return (
      matchCourseByRoute(remoteCourses, courseKey) ||
      matchCourseByRoute(batches, courseKey) ||
      normalizeCourseForRoute(batches[0])
    );
  }, [courseKey, remoteCourses]);

  const ensureAuth = async () => {
    const [user, token] = await Promise.all([getUser(), getToken()]);
    if (!user || !token) {
      router.push(`/login?redirect=${encodeURIComponent(`/checkout?course=${courseKey}`)}`);
      return false;
    }
    return true;
  };

  const coursePayload = () => ({
    _id: course._id,
    id: course.id,
    routeId: course.routeId,
    title: course.title,
    price: Number(course.priceValue || course.offerPrice || course.price || 0),
    image: course.image || course.thumbnail || "",
    thumbnail: course.thumbnail || course.image || "",
    instructor: course.instructor?.name || course.instructor || "BadamClasses",
    duration: course.duration || "Flexible",
    batchTime: course.batchTime || "",
    startDate: course.startDate || ""
  });

  const createQr = async () => {
    if (!(await ensureAuth())) return;
    setLoading(true);
    setNotice("");
    setQrSession(null);
    try {
      const session = await apiFetch("/payments/checkout/qr", {
        method: "POST",
        body: JSON.stringify({ courseId: course._id, course: coursePayload() })
      });
      setQrSession(session);
      setNotice("QR created. Pay using any UPI app, then keep this screen open for confirmation.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async () => {
    if (!(await ensureAuth())) return;
    setLoading(true);
    setNotice("");
    try {
      const order = await apiFetch("/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ courseId: course._id, course: coursePayload() })
      });
      setNotice(`Razorpay order created: ${order.orderId}. Native Razorpay SDK handoff can be enabled after package setup.`);
      await WebBrowser.openBrowserAsync("https://razorpay.com/payment-gateway/");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const pollQr = async () => {
    if (!qrSession?.qrId) return;
    setLoading(true);
    try {
      const status = await apiFetch(`/payments/checkout/qr/${encodeURIComponent(qrSession.qrId)}/status`);
      if (status?.paid) {
        router.replace(`/dashboard?payment=success&course=${encodeURIComponent(course.routeId || course._id || course.title)}`);
      } else {
        setNotice(`Payment status: ${status?.status || "pending"}`);
      }
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const price = Number(course.priceValue || course.offerPrice || course.price || 0);

  return (
    <Screen>
      <Title eyebrow="Secure checkout" subtitle="Payment and enrollment verification stay on the existing backend.">
        Complete Enrollment
      </Title>
      {notice ? <Notice>{notice}</Notice> : null}
      <Card>
        <Text style={styles.course}>{course.title}</Text>
        <Text style={styles.meta}>Instructor: {course.instructor?.name || course.instructor || "BadamClasses"}</Text>
        <Text style={styles.price}>₹{price.toLocaleString("en-IN")}</Text>
        <View style={styles.options}>
          <Chip>{option === "qr" ? "QR Selected" : "Razorpay Selected"}</Chip>
          <Button variant="ghost" onPress={() => setOption(option === "qr" ? "razorpay" : "qr")}>
            Switch to {option === "qr" ? "Razorpay" : "QR"}
          </Button>
        </View>
        <Button loading={loading} onPress={option === "qr" ? createQr : createOrder}>
          {option === "qr" ? "Generate Payment QR" : "Create Razorpay Order"}
        </Button>
      </Card>

      {qrSession?.imageUrl ? (
        <Card style={styles.qrCard}>
          <Text style={styles.qrTitle}>Scan to Pay</Text>
          <Image source={{ uri: qrSession.imageUrl }} style={styles.qr} />
          <Button loading={loading} onPress={pollQr}>I have paid, check status</Button>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  course: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  meta: {
    color: colors.soft,
    marginTop: 8
  },
  price: {
    color: "#fed7aa",
    fontSize: 30,
    fontWeight: "900",
    marginVertical: 16
  },
  options: {
    gap: 10,
    marginBottom: 14
  },
  qrCard: {
    marginTop: 14,
    alignItems: "center"
  },
  qrTitle: {
    color: colors.text,
    fontWeight: "900",
    marginBottom: 12
  },
  qr: {
    width: 240,
    height: 240,
    borderRadius: 16,
    backgroundColor: "#fff",
    marginBottom: 14
  }
});
