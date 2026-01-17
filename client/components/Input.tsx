import React, { forwardRef } from "react";
import { StyleSheet, View, TextInput, TextInputProps } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Feather.glyphMap;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, icon, style, ...props }, ref) => {
    const { theme } = useTheme();

    return (
      <View style={styles.container}>
        {label ? (
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            {label}
          </ThemedText>
        ) : null}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: error ? theme.error : "transparent",
            },
          ]}
        >
          {icon ? (
            <Feather
              name={icon}
              size={18}
              color={theme.textSecondary}
              style={styles.icon}
            />
          ) : null}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              { color: theme.text },
              icon ? styles.inputWithIcon : null,
              style,
            ]}
            placeholderTextColor={theme.textSecondary}
            {...props}
          />
        </View>
        {error ? (
          <ThemedText style={[styles.error, { color: theme.error }]}>
            {error}
          </ThemedText>
        ) : null}
      </View>
    );
  }
);

Input.displayName = "Input";

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  icon: {
    marginLeft: Spacing.lg,
  },
  input: {
    flex: 1,
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  inputWithIcon: {
    paddingLeft: Spacing.sm,
  },
  error: {
    fontSize: 13,
  },
});
