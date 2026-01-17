import React from "react";
import { StyleSheet, View, Pressable, Switch } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface CardItemProps {
  lastFourDigits: string;
  expiryDate: string;
  cardType: "virtual" | "physical";
  status: "active" | "frozen" | "pending_approval";
  onToggleFreeze?: (frozen: boolean) => void;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CardItem({
  lastFourDigits,
  expiryDate,
  cardType,
  status,
  onToggleFreeze,
  onPress,
}: CardItemProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const isFrozen = status === "frozen";

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handleToggle = (value: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onToggleFreeze?.(value);
  };

  const getGradientColors = (): [string, string, string] => {
    if (isFrozen) {
      return isDark 
        ? ["#4B5563", "#6B7280", "#9CA3AF"]
        : ["#9CA3AF", "#6B7280", "#4B5563"];
    }
    return isDark
      ? ["#1A5F7A", "#2E7D99", "#57C5B6"]
      : ["#1A5F7A", "#2980B9", "#57C5B6"];
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
          <View style={styles.typeContainer}>
            <Feather
              name={cardType === "virtual" ? "smartphone" : "credit-card"}
              size={16}
              color="rgba(255,255,255,0.8)"
            />
            <ThemedText style={styles.type}>
              {cardType === "virtual" ? "Virtual Card" : "Physical Card"}
            </ThemedText>
          </View>
          <View style={styles.freezeContainer}>
            <ThemedText style={styles.freezeLabel}>
              {isFrozen ? "Frozen" : "Active"}
            </ThemedText>
            <Switch
              value={isFrozen}
              onValueChange={handleToggle}
              trackColor={{ false: "rgba(255,255,255,0.3)", true: theme.error }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.cardNumberContainer}>
          <ThemedText style={styles.cardDots}>****</ThemedText>
          <ThemedText style={styles.cardDots}>****</ThemedText>
          <ThemedText style={styles.cardDots}>****</ThemedText>
          <ThemedText style={styles.cardNumber}>{lastFourDigits}</ThemedText>
        </View>

        <View style={styles.footer}>
          <View>
            <ThemedText style={styles.label}>EXPIRES</ThemedText>
            <ThemedText style={styles.value}>{expiryDate}</ThemedText>
          </View>
          <View style={styles.logoContainer}>
            <Feather name="shield" size={24} color="rgba(255,255,255,0.8)" />
          </View>
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
    minHeight: 200,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  typeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  type: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
  },
  freezeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  freezeLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },
  cardNumberContainer: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing["3xl"],
  },
  cardDots: {
    fontSize: 20,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 2,
  },
  cardNumber: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: Spacing["2xl"],
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: Spacing.xs,
  },
  logoContainer: {
    opacity: 0.8,
  },
});
