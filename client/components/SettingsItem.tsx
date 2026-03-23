import React from "react";
import { StyleSheet, View, Pressable, Switch, Platform, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SettingsItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
}

export function SettingsItem({
  icon,
  label,
  value,
  hasSwitch,
  switchValue,
  onSwitchChange,
  onPress,
  destructive,
}: SettingsItemProps) {
  const { theme } = useTheme();

  const textColor = destructive ? theme.error : theme.text;
  const isClickable = !hasSwitch && typeof onPress === "function";

  return (
    <Pressable
      onPress={isClickable ? onPress : undefined}
      disabled={!isClickable}
      testID={`settings-item-${label.toLowerCase().replace(/\s+/g, "-")}`}
      accessibilityRole={isClickable ? "button" : undefined}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.backgroundDefault },
        isClickable && pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name={icon} size={18} color={destructive ? theme.error : theme.primary} />
      </View>

      <View style={styles.content}>
        <ThemedText style={[styles.label, { color: textColor }]}>{label}</ThemedText>
        {value ? (
          <ThemedText style={[styles.value, { color: theme.textSecondary }]}>
            {value}
          </ThemedText>
        ) : null}
      </View>

      {hasSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor="#FFFFFF"
        />
      ) : (
        <Feather name="chevron-right" size={18} color={theme.textSecondary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: Spacing.xs,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
  },
  value: {
    fontSize: 13,
  },
});
