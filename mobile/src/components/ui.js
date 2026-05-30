import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, shadow, spacing } from "../lib/theme";

export function Screen({ children, scroll = true, padded = true, contentStyle, refreshControl }) {
  const Container = scroll ? ScrollView : View;
  return (
    <Container
      style={styles.screen}
      contentContainerStyle={scroll ? [styles.content, padded && styles.padded, contentStyle] : undefined}
      refreshControl={refreshControl}
    >
      {!scroll ? <View style={[padded && styles.padded, contentStyle]}>{children}</View> : children}
    </Container>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children, eyebrow, subtitle }) {
  return (
    <View style={styles.titleWrap}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{children}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Button({ children, onPress, disabled, loading, variant = "primary", style }) {
  const content = (
    <View style={styles.buttonContent}>
      {loading ? <ActivityIndicator color={colors.text} size="small" /> : null}
      <Text style={[styles.buttonText, variant === "ghost" && styles.ghostText]}>{children}</Text>
    </View>
  );

  if (variant === "ghost") {
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} style={[styles.ghostButton, disabled && styles.disabled, style]}>
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={[disabled && styles.disabled, style]}>
      <LinearGradient colors={["#fb923c", "#f97316", "#7c3aed"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
        {content}
      </LinearGradient>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType = "default", multiline = false }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}

export function Notice({ children, tone = "info" }) {
  return (
    <View style={[styles.notice, tone === "error" && styles.errorNotice, tone === "success" && styles.successNotice]}>
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

export function Chip({ children }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg
  },
  content: {
    paddingBottom: 36
  },
  padded: {
    padding: spacing.page
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    borderRadius: spacing.radius,
    padding: spacing.card,
    ...shadow
  },
  titleWrap: {
    marginBottom: 18
  },
  eyebrow: {
    color: "#fed7aa",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 8
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.soft,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  buttonContent: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  ghostText: {
    color: colors.soft
  },
  disabled: {
    opacity: 0.62
  },
  fieldWrap: {
    marginBottom: 14
  },
  label: {
    color: colors.soft,
    fontWeight: "700",
    marginBottom: 8
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.bg2,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 15
  },
  textarea: {
    minHeight: 110,
    paddingTop: 14,
    textAlignVertical: "top"
  },
  notice: {
    borderWidth: 1,
    borderColor: "rgba(251,146,60,0.35)",
    backgroundColor: "rgba(251,146,60,0.12)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14
  },
  errorNotice: {
    borderColor: "rgba(251,113,133,0.35)",
    backgroundColor: "rgba(251,113,133,0.12)"
  },
  successNotice: {
    borderColor: "rgba(52,211,153,0.35)",
    backgroundColor: "rgba(52,211,153,0.12)"
  },
  noticeText: {
    color: colors.text,
    lineHeight: 20
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  chipText: {
    color: colors.soft,
    fontSize: 12,
    fontWeight: "700"
  }
});
