import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface TransactionItemProps {
  type: "send" | "receive" | "request";
  fundType: "internet_funds" | "gyd" | "gyds";
  amount: string;
  recipient: string;
  date: string;
  status: "pending" | "completed" | "failed";
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TransactionItem({
  type,
  fundType,
  amount,
  recipient,
  date,
  status,
  onPress,
}: TransactionItemProps) {
  const { theme } = useTheme();
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

  const getIcon = (): keyof typeof Feather.glyphMap => {
    switch (type) {
      case "send":
        return "arrow-up-right";
      case "receive":
        return "arrow-down-left";
      case "request":
        return "clock";
      default:
        return "activity";
    }
  };

  const getIconColor = () => {
    switch (type) {
      case "send":
        return theme.error;
      case "receive":
        return theme.success;
      case "request":
        return theme.warning;
      default:
        return theme.text;
    }
  };

  const getAmountPrefix = () => {
    return type === "receive" ? "+" : type === "send" ? "-" : "";
  };

  const getFundLabel = () => {
    switch (fundType) {
      case "internet_funds":
        return "Internet Funds";
      case "gyd":
        return "GYD";
      case "gyds":
        return "GYDS";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return theme.success;
      case "pending":
        return theme.warning;
      case "failed":
        return theme.error;
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}15` }]}>
        <Feather name={getIcon()} size={20} color={getIconColor()} />
      </View>

      <View style={styles.details}>
        <ThemedText style={styles.recipient} numberOfLines={1}>
          {recipient}
        </ThemedText>
        <View style={styles.meta}>
          <ThemedText style={[styles.fundType, { color: theme.textSecondary }]}>
            {getFundLabel()}
          </ThemedText>
          <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
          <ThemedText style={[styles.date, { color: theme.textSecondary }]}>
            {date}
          </ThemedText>
        </View>
      </View>

      <View style={styles.amountContainer}>
        <ThemedText
          style={[
            styles.amount,
            { color: type === "receive" ? theme.success : theme.text },
          ]}
        >
          {getAmountPrefix()}
          {amount}
        </ThemedText>
        <ThemedText style={[styles.status, { color: getStatusColor() }]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </ThemedText>
      </View>
    </AnimatedPressable>
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
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  details: {
    flex: 1,
    gap: Spacing.xs,
  },
  recipient: {
    fontSize: 15,
    fontWeight: "600",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  fundType: {
    fontSize: 13,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  date: {
    fontSize: 13,
  },
  amountContainer: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  amount: {
    fontSize: 15,
    fontWeight: "600",
  },
  status: {
    fontSize: 12,
    fontWeight: "500",
  },
});
