import React from "react";
import { StyleSheet, View, Pressable } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{title}</ThemedText>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction}>
          <ThemedText style={[styles.action, { color: theme.primary }]}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  action: {
    fontSize: 14,
    fontWeight: "500",
  },
});
