import React, { useState } from "react";
import { StyleSheet, View, Alert, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type FundType = "internet_funds" | "gyd" | "gyds";

const fundOptions: { label: string; value: FundType; icon: keyof typeof Feather.glyphMap }[] = [
  { label: "Internet Funds", value: "internet_funds", icon: "globe" },
  { label: "GYD", value: "gyd", icon: "dollar-sign" },
  { label: "GYDS", value: "gyds", icon: "zap" },
];

export default function RequestMoneyScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [fundType, setFundType] = useState<FundType>("internet_funds");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!recipient) newErrors.recipient = "Recipient is required";
    if (!amount) newErrors.amount = "Amount is required";
    else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      newErrors.amount = "Enter a valid amount";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequest = async () => {
    if (!validate()) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "Request Sent",
        `Your request for ${fundType === "internet_funds" ? "$" : ""}${amount} ${fundType !== "internet_funds" ? fundType.toUpperCase() : ""} has been sent to ${recipient}.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert("Request Failed", "Could not send the request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing["2xl"],
        },
      ]}
    >
      <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        Select Fund Type
      </ThemedText>
      <View style={styles.fundOptions}>
        {fundOptions.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setFundType(option.value)}
            style={[
              styles.fundOption,
              {
                backgroundColor:
                  fundType === option.value ? theme.primary : theme.backgroundSecondary,
              },
            ]}
          >
            <Feather
              name={option.icon}
              size={18}
              color={fundType === option.value ? "#FFFFFF" : theme.text}
            />
            <ThemedText
              style={[
                styles.fundLabel,
                { color: fundType === option.value ? "#FFFFFF" : theme.text },
              ]}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.form}>
        <Input
          label="Request From"
          icon="user"
          placeholder="Username or email"
          value={recipient}
          onChangeText={setRecipient}
          error={errors.recipient}
          autoCapitalize="none"
        />

        <Input
          label="Amount"
          icon="dollar-sign"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          error={errors.amount}
          keyboardType="decimal-pad"
        />

        <Input
          label="Description (Optional)"
          icon="file-text"
          placeholder="What's this for?"
          value={description}
          onChangeText={setDescription}
        />

        <Button onPress={handleRequest} disabled={isLoading} style={styles.button}>
          {isLoading ? "Sending Request..." : "Send Request"}
        </Button>
      </View>

      <View style={[styles.infoBox, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="info" size={18} color={theme.primary} />
        <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
          The recipient will receive a notification and can approve or decline your request.
          Requests expire after 7 days.
        </ThemedText>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  fundOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  fundOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  fundLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  form: {
    gap: Spacing.lg,
  },
  button: {
    marginTop: Spacing.lg,
  },
  infoBox: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
