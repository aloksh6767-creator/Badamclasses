import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput } from "react-native";
import { login } from "@/api/auth";
import { RootStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Login Failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card style={styles.card}>
        <AppText variant="title">Welcome Back</AppText>
        <AppText muted>Login to access dashboard, purchased courses, and payments.</AppText>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={colors.muted} style={styles.input} />
        <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor={colors.muted} style={styles.input} />
        <Button loading={loading} disabled={!email || !password} onPress={submit}>Login</Button>
        <Pressable onPress={() => navigation.navigate("ForgotPassword")}><AppText style={styles.link}>Forgot password?</AppText></Pressable>
        <Pressable onPress={() => navigation.navigate("Signup")}><AppText style={styles.link}>Create new account</AppText></Pressable>
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
  },
  link: {
    color: colors.orange,
    fontWeight: "900",
    textAlign: "center"
  }
});
