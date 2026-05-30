import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Card, Field, Notice, Screen, Title } from "../src/components/ui";
import { apiFetch } from "../src/lib/api";
import { saveAuth } from "../src/lib/auth";
import { colors } from "../src/lib/theme";

export default function LoginScreen() {
  const params = useLocalSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const handleLogin = async () => {
    setNotice("");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      await saveAuth(data?.token, data?.user);
      router.replace(params.redirect ? String(params.redirect) : "/dashboard");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title eyebrow="Welcome back" subtitle="Login to access enrolled courses, invoices, admin tools, and checkout.">
        Student Login
      </Title>
      <Card>
        {notice ? <Notice tone="error">{notice}</Notice> : null}
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        <Button loading={loading} disabled={!email || !password} onPress={handleLogin}>Login</Button>
        <Pressable onPress={() => router.push("/forgot-password")}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/signup")}>
          <Text style={styles.link}>New student? Create account</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: {
    color: colors.cyan,
    textAlign: "center",
    fontWeight: "800",
    marginTop: 16
  }
});
