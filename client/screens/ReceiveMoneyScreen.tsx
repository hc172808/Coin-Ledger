import React, { useState } from "react";
import { StyleSheet, View, Share, Platform, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { FilterChip } from "@/components/FilterChip";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";

type FundType = "internet_funds" | "gyd" | "gyds";

export default function ReceiveMoneyScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user, wallet } = useAuth();

  const [fundType, setFundType] = useState<FundType>("internet_funds");
  const [copied, setCopied] = useState(false);

  const getAddress = (): string | null => {
    if (fundType === "internet_funds") {
      return user?.email ?? null;
    }
    return wallet?.address ?? null;
  };

  const address = getAddress();

  const getLabel = () => {
    switch (fundType) {
      case "internet_funds":
        return "Your Email (for Internet Funds)";
      case "gyd":
      case "gyds":
        return "Your Wallet Address";
    }
  };

  const handleCopy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Send me ${fundType === "internet_funds" ? "Internet Funds" : fundType.toUpperCase()} to: ${getAddress()}`,
      });
    } catch (error) {
      console.error("Share failed:", error);
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
        <FilterChip
          label="Internet Funds"
          isSelected={fundType === "internet_funds"}
          onPress={() => setFundType("internet_funds")}
        />
        <FilterChip
          label="GYD"
          isSelected={fundType === "gyd"}
          onPress={() => setFundType("gyd")}
        />
        <FilterChip
          label="GYDS"
          isSelected={fundType === "gyds"}
          onPress={() => setFundType("gyds")}
        />
      </View>

      <View style={[styles.qrContainer, { backgroundColor: theme.backgroundDefault }]}>
        <View style={[styles.qrPlaceholder, { backgroundColor: "#ffffff" }]} testID="qr-code">
          {address ? (
            <QRCode
              value={address}
              size={200}
              color={theme.text}
              backgroundColor="#ffffff"
            />
          ) : (
            <View style={styles.qrLoading}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText style={[styles.qrLabel, { color: theme.textSecondary }]}>
                {fundType === "internet_funds" ? "Loading account..." : "Loading wallet..."}
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      <ThemedText style={[styles.addressLabel, { color: theme.textSecondary }]}>
        {getLabel()}
      </ThemedText>
      <Pressable
        onPress={handleCopy}
        style={[styles.addressContainer, { backgroundColor: theme.backgroundSecondary }]}
      >
        <ThemedText style={styles.address} numberOfLines={1}>
          {getAddress()}
        </ThemedText>
        <Feather
          name={copied ? "check" : "copy"}
          size={18}
          color={copied ? theme.success : theme.primary}
        />
      </Pressable>
      {copied ? (
        <ThemedText style={[styles.copiedText, { color: theme.success }]}>
          Copied to clipboard!
        </ThemedText>
      ) : null}

      <View style={styles.actions}>
        <Button onPress={handleShare} style={styles.button}>
          Share Address
        </Button>
      </View>

      <View style={[styles.infoBox, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="info" size={18} color={theme.primary} />
        <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
          {fundType === "internet_funds"
            ? "Share your email to receive Internet Funds. Transfers are instant and reversible."
            : `Share your wallet address to receive ${fundType.toUpperCase()}. Blockchain transfers are irreversible.`}
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
  qrContainer: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  qrLabel: {
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  qrLoading: {
    alignItems: "center",
    justifyContent: "center",
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  address: {
    flex: 1,
    fontSize: 14,
    fontFamily: "monospace",
  },
  copiedText: {
    fontSize: 13,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  actions: {
    marginTop: Spacing.xl,
  },
  button: {
    width: "100%",
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
