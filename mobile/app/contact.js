import { useState } from "react";
import { Linking, StyleSheet, Text } from "react-native";
import { Button, Card, Field, Notice, Screen, Title } from "../src/components/ui";
import { apiFetch } from "../src/lib/api";
import { colors } from "../src/lib/theme";

export default function ContactScreen() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setLoading(true);
    setNotice("");
    try {
      const data = await apiFetch("/inquiries", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setNotice(data?.message || "Message sent.");
      setForm({ name: "", email: "", message: "" });
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title eyebrow="Support" subtitle="Reach out for admission, payments, offline tests, or technical support.">
        Contact BadamClasses
      </Title>
      {notice ? <Notice>{notice}</Notice> : null}
      <Card>
        <Field label="Name" value={form.name} onChangeText={update("name")} placeholder="Your name" />
        <Field label="Email" value={form.email} onChangeText={update("email")} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="Message" value={form.message} onChangeText={update("message")} placeholder="How can we help?" multiline />
        <Button loading={loading} disabled={!form.name || !form.email || !form.message} onPress={submit}>Send Message</Button>
      </Card>
      <Card style={styles.card}>
        <Text style={styles.link} onPress={() => Linking.openURL("mailto:support@badamclasses.com")}>support@badamclasses.com</Text>
        <Text style={styles.link} onPress={() => Linking.openURL("tel:+919000011111")}>+91 90000 11111</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14
  },
  link: {
    color: colors.cyan,
    fontWeight: "800",
    lineHeight: 28
  }
});
