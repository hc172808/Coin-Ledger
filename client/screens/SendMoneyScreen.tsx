import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Platform, Pressable, Modal, Animated, Easing, ActivityIndicator } from "react-native";
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
import { apiRequest } from "@/lib/query-client";

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
  const { wallet, refreshWallet } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "SendMoney">>();

  const initialFundType = (route.params?.fundType as FundType) || "internet_funds";
  const [fundType, setFundType] = useState<FundType>(initialFundType);
  const [recipient, setRecipient] = useState(route.params?.recipient || "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<"validating" | "carrying" | "confirming">("validating");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const planeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isLoading) { planeAnim.setValue(0); return; }
    const loop = Animated.loop(
      Animated.timing(planeAnim, {
        toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [isLoading, planeAnim]);

  const planeTranslate = planeAnim.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] });
  const planeOpacity = planeAnim.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] });

  const getBalance = () => {
    if (!wallet) return "0.00";
    switch (fundType) {
      case "internet_funds": return wallet.internetFundsBalance;
      case "gyd": return wallet.gydBalance;
      case "gyds": return wallet.gydsBalance;
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!recipient.trim()) newErrors.recipient = "Recipient is required";
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
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setStage("validating");
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 350));
      setStage("carrying");
      await apiRequest("POST", "/api/transactions/send", {
        recipient: recipient.trim(),
        amount: parseFloat(amount),
        fundType,
        description: description.trim() || undefined,
      });
      setStage("confirming");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshWallet();
      await new Promise((r) => setTimeout(r, 250));
      setSuccessModal(true);
    } catch (e: any) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e?.message?.includes(":") ? e.message.split(": ").slice(1).join(": ") : "Could not complete the transfer. Please try again.";
      setErrorMsg(msg);
      setErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanQR = () => navigation.navigate("QRScanner");

  const currency = fundType === "internet_funds" ? "$" : fundType.toUpperCase();

  return (
    <>
      <KeyboardAwareScrollViewCompat
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing["2xl"] },
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
                { backgroundColor: fundType === option.value ? theme.primary : theme.backgroundSecondary },
              ]}
            >
              <Feather name={option.icon} size={18} color={fundType === option.value ? "#fff" : theme.text} />
              <ThemedText
                style={[styles.fundLabel, { color: fundType === option.value ? "#fff" : theme.text }]}
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
                testID="input-recipient"
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
            testID="input-amount"
          />

          <Input
            label="Description (Optional)"
            icon="file-text"
            placeholder="What's this for?"
            value={description}
            onChangeText={setDescription}
            testID="input-description"
          />

          <Button
            testID="button-send-money"
            onPress={handleSend}
            disabled={isLoading}
            style={styles.button}
          >
            {isLoading ? "Sending..." : "Send Money"}
          </Button>
        </View>
      </KeyboardAwareScrollViewCompat>

      <Modal visible={isLoading} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.flightStrip}>
              <Feather name="user" size={20} color={theme.textSecondary} />
              <View style={[styles.flightLine, { backgroundColor: theme.border }]} />
              <Animated.View
                style={[
                  styles.flightPlane,
                  { transform: [{ translateX: planeTranslate }], opacity: planeOpacity },
                ]}
              >
                <Feather name="send" size={22} color={theme.primary} />
              </Animated.View>
              <Feather name="user-check" size={20} color={theme.textSecondary} />
            </View>
            <ActivityIndicator size="small" color={theme.primary} />
            <ThemedText type="h3" style={styles.modalTitle}>
              {stage === "validating" ? "Validating transfer" : stage === "carrying" ? "Carrying your funds" : "Confirming transfer"}
            </ThemedText>
            <ThemedText style={[styles.modalMsg, { color: theme.textSecondary }]}>
              {stage === "validating"
                ? "Checking recipient and balance..."
                : stage === "carrying"
                ? `Sending ${currency === "$" ? "$" : ""}${amount}${currency !== "$" ? " " + currency : ""} to ${recipient}...`
                : "Almost done — finalizing your transaction..."}
            </ThemedText>
          </View>
        </View>
      </Modal>

      <Modal visible={successModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.modalIconWrap, { backgroundColor: `${theme.success}20` }]}>
              <Feather name="check-circle" size={32} color={theme.success} />
            </View>
            <ThemedText type="h3" style={styles.modalTitle}>Transfer Successful</ThemedText>
            <ThemedText style={[styles.modalMsg, { color: theme.textSecondary }]}>
              You sent {fundType === "internet_funds" ? "$" : ""}{amount} {fundType !== "internet_funds" ? fundType.toUpperCase() : ""} to {recipient}.
            </ThemedText>
            <Pressable
              testID="button-done-send"
              style={[styles.modalBtn, { backgroundColor: theme.primary }]}
              onPress={() => { setSuccessModal(false); navigation.goBack(); }}
            >
              <ThemedText style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Done</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={errorModal} transparent animationType="fade" onRequestClose={() => setErrorModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
          <View style={[styles.modalCard, styles.errorCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.error }]}>
            <View style={[styles.errorBanner, { backgroundColor: theme.error }]}>
              <Feather name="alert-octagon" size={18} color="#fff" />
              <ThemedText style={styles.errorBannerText}>TRANSFER BLOCKED</ThemedText>
            </View>
            <View style={[styles.modalIconWrap, { backgroundColor: `${theme.error}20`, marginTop: Spacing.md }]}>
              <Feather name="x-circle" size={32} color={theme.error} />
            </View>
            <ThemedText type="h3" style={styles.modalTitle}>Transfer Failed</ThemedText>
            <ThemedText style={[styles.modalMsg, { color: theme.textSecondary }]}>
              {errorMsg}
            </ThemedText>
            <Pressable
              testID="button-close-error"
              style={[styles.modalBtn, { backgroundColor: theme.error }]}
              onPress={() => setErrorModal(false)}
            >
              <ThemedText style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Try Again</ThemedText>
            </Pressable>
            <Pressable
              testID="button-cancel-error"
              style={[styles.modalBtn, { backgroundColor: "transparent", marginTop: 0 }]}
              onPress={() => { setErrorModal(false); navigation.goBack(); }}
            >
              <ThemedText style={{ color: theme.textSecondary, fontWeight: "500", fontSize: 14 }}>Cancel</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  sectionLabel: { fontSize: 14, fontWeight: "500", marginBottom: Spacing.sm },
  fundOptions: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.xl },
  fundOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  fundLabel: { fontSize: 12, fontWeight: "500" },
  balanceInfo: { padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.xl },
  balanceLabel: { fontSize: 13, marginBottom: Spacing.xs },
  form: { gap: Spacing.lg },
  recipientRow: { flexDirection: "row", gap: Spacing.sm, alignItems: "flex-end" },
  recipientInput: { flex: 1 },
  scanButton: {
    width: Spacing.inputHeight,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  button: { marginTop: Spacing.lg },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalCard: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { textAlign: "center" },
  modalMsg: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  modalBtn: {
    width: "100%",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  loadingCard: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
  },
  flightStrip: {
    width: "100%",
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.sm,
    position: "relative",
  },
  flightLine: {
    position: "absolute",
    left: 36,
    right: 36,
    height: 2,
    top: 29,
  },
  flightPlane: {
    position: "absolute",
    left: "50%",
    marginLeft: -11,
    top: 19,
  },
  errorCard: {
    borderWidth: 2,
    paddingTop: 0,
    overflow: "hidden",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    width: "100%",
    paddingVertical: Spacing.sm,
    marginHorizontal: -Spacing.xl,
    marginTop: -Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  errorBannerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
