import { PropsWithChildren } from "react";
import { StyleSheet, Text, TextProps } from "react-native";
import { colors } from "@/theme/colors";

type Props = PropsWithChildren<TextProps & { variant?: "title" | "subtitle" | "body" | "caption"; muted?: boolean }>;

export function AppText({ children, variant = "body", muted, style, ...props }: Props) {
  return (
    <Text {...props} style={[styles.base, styles[variant], muted && styles.muted, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    letterSpacing: 0
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900"
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800"
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500"
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  muted: {
    color: colors.muted
  }
});
