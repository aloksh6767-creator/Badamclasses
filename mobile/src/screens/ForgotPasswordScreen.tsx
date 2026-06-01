import { useState } from "react";
import { Alert, StyleSheet, TextInput } from "react-native";
import { forgotPassword } from "@/api/auth";
import { colors } from "@/theme/colors";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const response = await forgotPassword(email.trim());
      Alert.alert("Check Email", response.message || "Password reset instructions sent.");
    } catch (error) {
      Alert.alert("Unable to Send", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card style={styles.card}>
        <AppText variant="title">Reset Password</AppText>
        <AppText muted>Enter your registered email to request a password reset.</AppText>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={colors.muted} style={styles.input} />
        <Button loading={loading} disabled={!email} onPress={submit}>Send Reset Link</Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.navy2,
    color: colors.text,
    paddingHorizontal: 14
  }
});
