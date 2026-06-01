import { mockTests } from "@/data/fallbackCourses";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";

export function MockTestsScreen() {
  return (
    <Screen>
      <AppText variant="title">Mock Tests</AppText>
      {mockTests.map((test) => (
        <Card key={test.id}>
          <AppText variant="subtitle">{test.title}</AppText>
          <AppText muted>{test.questions} questions | {test.duration}</AppText>
          <Button variant="secondary" onPress={() => undefined}>Start Test</Button>
        </Card>
      ))}
    </Screen>
  );
}
