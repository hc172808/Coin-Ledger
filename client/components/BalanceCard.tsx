import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface BalanceCardProps {
  title: string;
  balance: string;
  currency: string;
  icon: keyof typeof Feather.glyphMap;
  type: "internet" | "blockchain" | "gyds";
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function BalanceCard({
  title,
  balance,
  currency,
  icon,
  type,
  onPress,
}: BalanceCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const getGradientColors = (): [string, string] => {
    switch (type) {
      case "internet":
        return isDark ? ["#1A5F7A", "#2E7D99"] : ["#1A5F7A", "#2980B9"];
      case "blockchain":
        return isDark ? ["#57C5B6", "#7DD3C7"] : ["#57C5B6", "#48A999"];
      case "gyds":
        return isDark ? ["#6366F1", "#8B5CF6"] : ["#6366F1", "#7C3AED"];
      default:
        return [theme.primary, theme.primaryLight];
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Feather name={icon} size={20} color="rgba(255,255,255,0.9)" />
          </View>
          <ThemedText style={styles.title}>{title}</ThemedText>
        </View>

        <View style={styles.balanceContainer}>
          <ThemedText style={styles.currency}>{currency}</ThemedText>
          <ThemedText style={styles.balance}>{balance}</ThemedText>
        </View>

        <View style={styles.footer}>
          <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.6)" />
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  gradient: {
    padding: Spacing.xl,
    minHeight: 140,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
  },
  balanceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  currency: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  balance: {
    ...Typography.balance,
    color: "#FFFFFF",
  },
  footer: {
    position: "absolute",
    bottom: Spacing.lg,
    right: Spacing.lg,
  },
});
