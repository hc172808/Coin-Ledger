import React, { useState } from "react";
import { StyleSheet, View, Alert, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type FundType = "internet_funds" | "gyd" | "gyds";

const fundOptions: { label: string; value: FundType; icon: keyof typeof Feather.glyphMap }[] = [
  { label: "Internet Funds", value: "internet_funds", icon: "globe" },
  { label: "GYD (Stablecoin)", value: "gyd", icon: "dollar-sign" },
  { label: "GYDS (Gas/Fees)", value: "gyds", icon: "zap" },
];

export default function SendMoneyScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { wallet } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "SendMoney">>();

  const initialFundType = route.params?.fundType || "internet_funds";
  const [fundType, setFundType] = useState<FundType>(initialFundType);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getBalance = () => {
    if (!wallet) return "0.00";
    switch (fundType) {
      case "internet_funds":
        return wallet.internetFundsBalance;
      case "gyd":
        return wallet.gydBalance;
      case "gyds":
        return wallet.gydsBalance;
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!recipient) newErrors.recipient = "Recipient is required";
    if (!amount) newErrors.amount = "Amount is required";
    else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      newErrors.amount = "Enter a valid amount";
    } else if (parseFloat(amount) > parseFloat(getBalance())) {
      newErrors.amount = "Insufficient balance";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSend = async () => {
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
        "Transfer Successful",
        `You sent ${fundType === "internet_funds" ? "$" : ""}${amount} ${fundType !== "internet_funds" ? fundType.toUpperCase() : ""} to ${recipient}.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert("Transfer Failed", "Could not complete the transfer. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanQR = () => {
    navigation.navigate("QRScanner");
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

      <View style={[styles.balanceInfo, { backgroundColor: theme.backgroundSecondary }]}>
        <ThemedText style={[styles.balanceLabel, { color: theme.textSecondary }]}>
          Available Balance
        </ThemedText>
        <ThemedText type="h3">
          {fundType === "internet_funds" ? "$" : ""}
          {parseFloat(getBalance()).toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
          {fundType !== "internet_funds" ? fundType.toUpperCase() : ""}
        </ThemedText>
      </View>

      <View style={styles.form}>
        <View style={styles.recipientRow}>
          <View style={styles.recipientInput}>
            <Input
              label="Recipient"
              icon="user"
              placeholder="Username, email, or wallet address"
              value={recipient}
              onChangeText={setRecipient}
              error={errors.recipient}
              autoCapitalize="none"
            />
          </View>
          <Pressable
            onPress={handleScanQR}
            style={[styles.scanButton, { backgroundColor: theme.backgroundSecondary }]}
          >
            <Feather name="maximize" size={22} color={theme.primary} />
          </Pressable>
        </View>

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

        <Button onPress={handleSend} disabled={isLoading} style={styles.button}>
          {isLoading ? "Sending..." : "Send Money"}
        </Button>
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
  balanceInfo: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  balanceLabel: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  form: {
    gap: Spacing.lg,
  },
  recipientRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "flex-end",
  },
  recipientInput: {
    flex: 1,
  },
  scanButton: {
    width: Spacing.inputHeight,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  button: {
    marginTop: Spacing.lg,
  },
});
