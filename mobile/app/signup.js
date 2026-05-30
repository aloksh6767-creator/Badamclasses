import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { Button, Card, Field, Notice, Screen, Title } from "../src/components/ui";
import { apiFetch } from "../src/lib/api";
import { saveAuth } from "../src/lib/auth";
import { colors } from "../src/lib/theme";

export default function SignupScreen() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", otpCode: "" });
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const sendOtp = async () => {
    setLoading(true);
    setNotice("");
    try {
      const data = await apiFetch("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone: form.phone })
      });
      setOtpSent(true);
      setNotice(data?.devCode ? `OTP sent. Dev OTP: ${data.devCode}` : "OTP sent to your phone.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signup = async () => {
    setLoading(true);
    setNotice("");
    try {
      await apiFetch("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone: form.phone, code: form.otpCode })
      });
      const data = await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify(form)
      });
      await saveAuth(data?.token, data?.user);
      router.replace("/dashboard");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title eyebrow="Create account" subtitle="Phone OTP is preserved from the website auth flow.">
        Register
      </Title>
      <Card>
        {notice ? <Notice tone={otpSent ? "success" : "error"}>{notice}</Notice> : null}
        <Field label="Name" value={form.name} onChangeText={update("name")} placeholder="Student name" />
        <Field label="Email" value={form.email} onChangeText={update("email")} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="Phone" value={form.phone} onChangeText={update("phone")} placeholder="9876543210" keyboardType="phone-pad" />
        <Field label="Password" value={form.password} onChangeText={update("password")} placeholder="Minimum 6 characters" secureTextEntry />
        <Button variant="ghost" loading={loading} disabled={!form.phone} onPress={sendOtp}>Send OTP</Button>
        <Text style={styles.gap} />
        <Field label="OTP" value={form.otpCode} onChangeText={update("otpCode")} placeholder="6 digit code" keyboardType="number-pad" />
        <Button loading={loading} disabled={!form.name || !form.email || !form.phone || !form.password || !form.otpCode} onPress={signup}>
          Create Account
        </Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {
    height: 10,
    color: colors.bg
  }
});
