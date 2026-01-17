import React, { useState } from "react";
import { StyleSheet, View, Image, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { SettingsItem } from "@/components/SettingsItem";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  const handleToggle2FA = async (enabled: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTwoFactorEnabled(enabled);
    Alert.alert(
      enabled ? "2FA Enabled" : "2FA Disabled",
      enabled
        ? "Two-factor authentication is now active for extra security."
        : "Two-factor authentication has been disabled."
    );
  };

  const handleToggleBiometrics = async (enabled: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setBiometricsEnabled(enabled);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          await logout();
        },
      },
    ]);
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.profileHeader}>
        <View style={[styles.avatarContainer, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.avatarText}>
            {user?.username?.charAt(0).toUpperCase() || "U"}
          </ThemedText>
        </View>
        <ThemedText type="h3" style={styles.username}>
          {user?.username || "User"}
        </ThemedText>
        <ThemedText style={[styles.email, { color: theme.textSecondary }]}>
          {user?.email || "user@example.com"}
        </ThemedText>
      </View>

      <SectionHeader title="Security" />
      <View style={styles.settingsGroup}>
        <SettingsItem
          icon="shield"
          label="Two-Factor Authentication"
          hasSwitch
          switchValue={twoFactorEnabled}
          onSwitchChange={handleToggle2FA}
        />
        <SettingsItem
          icon="smartphone"
          label="Biometric Login"
          value={biometricsEnabled ? "Enabled" : "Disabled"}
          hasSwitch
          switchValue={biometricsEnabled}
          onSwitchChange={handleToggleBiometrics}
        />
        <SettingsItem
          icon="key"
          label="Change PIN"
          onPress={() => Alert.alert("Change PIN", "PIN change feature coming soon.")}
        />
        <SettingsItem
          icon="lock"
          label="Change Password"
          onPress={() => Alert.alert("Change Password", "Password change feature coming soon.")}
        />
      </View>

      <SectionHeader title="Account" />
      <View style={styles.settingsGroup}>
        <SettingsItem
          icon="user"
          label="Personal Information"
          onPress={() => Alert.alert("Personal Info", "Personal information feature coming soon.")}
        />
        <SettingsItem
          icon="credit-card"
          label="Payment Methods"
          onPress={() => Alert.alert("Payment Methods", "Payment methods feature coming soon.")}
        />
        <SettingsItem
          icon="file-text"
          label="Transaction Limits"
          onPress={() => Alert.alert("Limits", "Transaction limits feature coming soon.")}
        />
      </View>

      <SectionHeader title="Support" />
      <View style={styles.settingsGroup}>
        <SettingsItem
          icon="help-circle"
          label="Help Center"
          onPress={() => Alert.alert("Help", "Help center feature coming soon.")}
        />
        <SettingsItem
          icon="message-circle"
          label="Contact Support"
          onPress={() => Alert.alert("Support", "Contact support feature coming soon.")}
        />
        <SettingsItem
          icon="info"
          label="About GYDS Banking"
          value="Version 1.0.0"
          onPress={() => {}}
        />
      </View>

      <View style={[styles.settingsGroup, { marginTop: Spacing["2xl"] }]}>
        <SettingsItem
          icon="log-out"
          label="Sign Out"
          destructive
          onPress={handleLogout}
        />
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
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  username: {
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: 15,
  },
  settingsGroup: {
    gap: Spacing.sm,
  },
});
