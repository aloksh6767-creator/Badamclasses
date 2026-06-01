import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors } from "@/theme/colors";
import { AppText } from "./AppText";
import { Button } from "./Button";

type Props = {
  loading?: boolean;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StateView({ loading, title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      {loading ? <ActivityIndicator color={colors.orange} size="large" /> : null}
      {title ? <AppText variant="subtitle">{title}</AppText> : null}
      {message ? <AppText muted style={styles.center}>{message}</AppText> : null}
      {actionLabel && onAction ? <Button onPress={onAction} variant="ghost">{actionLabel}</Button> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16
  },
  center: {
    textAlign: "center"
  }
});
