import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { createPaymentOrder } from "@/api/payments";
import { RootStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { formatRupees } from "@/utils/format";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "Checkout">;

export function CheckoutScreen({ route }: Props) {
  const { course } = route.params;
  const [loading, setLoading] = useState(false);

  const startPayment = async () => {
    setLoading(true);
    try {
      await createPaymentOrder(course);
      Alert.alert("Payment Started", "Order created. Connect Razorpay checkout UI in production build.");
    } catch (error) {
      Alert.alert("Payment Error", error instanceof Error ? error.message : "Unable to start payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card style={styles.card}>
        <AppText variant="caption" style={styles.gold}>Order Summary</AppText>
        <AppText variant="title">{course.title}</AppText>
        <AppText muted>{course.instructor} | {course.duration}</AppText>
        <AppText style={styles.price}>{formatRupees(course.offerPrice || course.priceValue)}</AppText>
      </Card>
      <Button loading={loading} onPress={startPayment}>Proceed to Payment</Button>
      <AppText muted>Payments stay server-verified through existing backend endpoints.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10
  },
  gold: {
    color: colors.gold
  },
  price: {
    color: colors.gold,
    fontSize: 26,
    fontWeight: "900"
  }
});
