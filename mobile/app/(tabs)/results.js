import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button, Card, Field, Notice, Screen, Title } from "../../src/components/ui";
import { apiFetch } from "../../src/lib/api";
import { colors } from "../../src/lib/theme";

export default function ResultsScreen() {
  const [latest, setLatest] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    apiFetch("/offline-tests?limit=6")
      .then((data) => setLatest(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const search = async () => {
    setNotice("");
    try {
      const data = await apiFetch(`/offline-tests/results?query=${encodeURIComponent(query)}`);
      setResults(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
      if (!data?.items?.length && !Array.isArray(data)) setNotice("No result found.");
    } catch (error) {
      setNotice(error.message);
    }
  };

  const items = results.length ? results : latest;

  return (
    <Screen>
      <Title eyebrow="Results" subtitle="Search by roll number, phone, or student detail.">
        Offline Test Results
      </Title>
      {notice ? <Notice>{notice}</Notice> : null}
      <Card style={styles.searchCard}>
        <Field label="Search" value={query} onChangeText={setQuery} placeholder="Roll number or phone" />
        <Button onPress={search} disabled={!query}>Find Result</Button>
      </Card>
      {items.map((item, index) => (
        <Card key={item._id || index} style={styles.card}>
          <Text style={styles.title}>{item.studentName || item.examName || "Result"}</Text>
          <Text style={styles.meta}>Roll: {item.rollNumber || "-"}</Text>
          <Text style={styles.meta}>Exam: {item.examName || "-"}</Text>
          <Text style={styles.score}>Marks: {item.marksObtained ?? "-"} / {item.totalMarks ?? "-"}</Text>
          <Text style={styles.meta}>Rank: {item.rank || "-"}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchCard: {
    marginBottom: 14
  },
  card: {
    marginBottom: 12
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  meta: {
    color: colors.soft,
    marginTop: 6
  },
  score: {
    color: "#fed7aa",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8
  }
});
