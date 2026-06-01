import { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";
import { AppText } from "./AppText";

type Props = PropsWithChildren<{
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}>;

export function Button({ children, onPress, variant = "primary", loading, disabled, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, (disabled || loading) && styles.disabled, style]}
    >
      {loading ? <ActivityIndicator color={colors.white} /> : <AppText style={styles.label}>{children}</AppText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  primary: {
    backgroundColor: colors.red
  },
  secondary: {
    backgroundColor: colors.blue
  },
  ghost: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }]
  },
  disabled: {
    opacity: 0.55
  },
  label: {
    fontWeight: "900",
    color: colors.white
  }
});
