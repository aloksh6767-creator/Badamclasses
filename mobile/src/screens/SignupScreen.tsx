import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, StyleSheet, TextInput } from "react-native";
import { signup } from "@/api/auth";
import { RootStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

export function SignupScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await signup(name.trim(), email.trim(), password, phone.trim());
      navigation.goBack();
    } catch (error) {
      Alert.alert("Signup Failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card style={styles.card}>
        <AppText variant="title">Create Account</AppText>
        <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.muted} style={styles.input} />
        <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="WhatsApp number" placeholderTextColor={colors.muted} style={styles.input} />
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={colors.muted} style={styles.input} />
        <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor={colors.muted} style={styles.input} />
        <Button loading={loading} disabled={!name || !email || !password} onPress={submit}>Register</Button>
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
