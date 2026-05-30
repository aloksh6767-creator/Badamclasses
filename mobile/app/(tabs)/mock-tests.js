import { useEffect, useState } from "react";
import { Linking, RefreshControl, StyleSheet, Text } from "react-native";
import { Button, Card, Field, Notice, Screen, Title } from "../../src/components/ui";
import { apiFetch } from "../../src/lib/api";
import { colors } from "../../src/lib/theme";

export default function MockTestsScreen() {
  const [tests, setTests] = useState([]);
  const [form, setForm] = useState({ studentName: "", phone: "", email: "", examName: "", batchName: "" });
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const load = async () => {
    setRefreshing(true);
    try {
      const data = await apiFetch("/offline-tests?limit=10");
      setTests(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const register = async () => {
    setNotice("");
    try {
      const data = await apiFetch("/offline-tests/register", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setNotice(data?.message || "Registration submitted.");
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.orange} />}>
      <Title eyebrow="Mock Tests" subtitle="Register for offline tests and open published online test links.">
        Tests
      </Title>
      {notice ? <Notice>{notice}</Notice> : null}
      {tests.map((test, index) => (
        <Card key={test._id || index} style={styles.card}>
          <Text style={styles.title}>{test.examName || test.title || "Mock Test"}</Text>
          <Text style={styles.meta}>{test.testDate || test.date || "Date will be announced"} • {test.center || "BadamClasses"}</Text>
          {test.link || test.url ? <Button variant="ghost" onPress={() => Linking.openURL(test.link || test.url)}>Open Test</Button> : null}
        </Card>
      ))}
      <Card>
        <Text style={styles.title}>Register for Test</Text>
        <Field label="Name" value={form.studentName} onChangeText={update("studentName")} placeholder="Student name" />
        <Field label="Phone" value={form.phone} onChangeText={update("phone")} placeholder="9876543210" keyboardType="phone-pad" />
        <Field label="Email" value={form.email} onChangeText={update("email")} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="Exam" value={form.examName} onChangeText={update("examName")} placeholder="SSC Offline Mega Test" />
        <Field label="Batch" value={form.batchName} onChangeText={update("batchName")} placeholder="Optional" />
        <Button onPress={register} disabled={!form.studentName || !form.phone || !form.examName}>Submit Registration</Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8
  },
  meta: {
    color: colors.soft,
    marginBottom: 12
  }
});
