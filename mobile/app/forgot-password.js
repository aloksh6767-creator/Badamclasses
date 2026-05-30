import { useState } from "react";
import { router } from "expo-router";
import { Button, Card, Field, Notice, Screen, Title } from "../src/components/ui";
import { apiFetch } from "../src/lib/api";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOtp = async () => {
    setLoading(true);
    setNotice("");
    try {
      const data = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setNotice(data?.devCode ? `OTP sent. Dev OTP: ${data.devCode}` : data?.message || "OTP sent.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, otpCode, newPassword })
      });
      router.replace("/login");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title eyebrow="Account help" subtitle="Reset your password using the same backend OTP flow.">
        Forgot Password
      </Title>
      <Card>
        {notice ? <Notice>{notice}</Notice> : null}
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Button variant="ghost" loading={loading} disabled={!email} onPress={requestOtp}>Send Reset OTP</Button>
        <Field label="OTP" value={otpCode} onChangeText={setOtpCode} placeholder="6 digit code" keyboardType="number-pad" />
        <Field label="New Password" value={newPassword} onChangeText={setNewPassword} placeholder="New password" secureTextEntry />
        <Button loading={loading} disabled={!email || !otpCode || !newPassword} onPress={resetPassword}>Reset Password</Button>
      </Card>
    </Screen>
  );
}
