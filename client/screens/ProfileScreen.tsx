import React, { useState, useEffect } from "react";
import { StyleSheet, View, Modal, TouchableOpacity, Pressable, Platform, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { SettingsItem } from "@/components/SettingsItem";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const { theme } = useTheme();
  if (!visible) return null;
  return (
    <View
      testID="toast-message"
      style={[styles.toast, { backgroundColor: theme.primary }]}
      pointerEvents="none"
    >
      <ThemedText style={styles.toastText}>{message}</ThemedText>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  const handleToggle2FA = async (enabled: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTwoFactorEnabled(enabled);
    showToast(enabled ? "Two-factor authentication enabled." : "Two-factor authentication disabled.");
  };

  const handleToggleBiometrics = async (enabled: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setBiometricsEnabled(enabled);
    showToast(enabled ? "Biometric login enabled." : "Biometric login disabled.");
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await logout();
  };

  return (
    <>
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
            onPress={() => showToast("PIN change feature coming soon.")}
          />
          <SettingsItem
            icon="lock"
            label="Change Password"
            onPress={() => showToast("Password change feature coming soon.")}
          />
        </View>

        <SectionHeader title="Account" />
        <View style={styles.settingsGroup}>
          <SettingsItem
            icon="user"
            label="Personal Information"
            onPress={() => showToast("Personal information feature coming soon.")}
          />
          <SettingsItem
            icon="credit-card"
            label="Payment Methods"
            onPress={() => showToast("Payment methods feature coming soon.")}
          />
          <SettingsItem
            icon="file-text"
            label="Transaction Limits"
            onPress={() => showToast("Transaction limits feature coming soon.")}
          />
        </View>

        <SectionHeader title="Support" />
        <View style={styles.settingsGroup}>
          <SettingsItem
            icon="help-circle"
            label="Help Center"
            onPress={() => showToast("Help center feature coming soon.")}
          />
          <SettingsItem
            icon="message-circle"
            label="Contact Support"
            onPress={() => showToast("Contact support feature coming soon.")}
          />
          <SettingsItem
            icon="info"
            label="About GYDS Banking"
            value="Version 1.0.0"
            onPress={() => showToast("GYDS Banking v1.0.0")}
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

      <Toast message={toastMessage} visible={toastVisible} />

      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            testID="logout-modal"
            style={[styles.modalCard, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={[styles.modalIconWrap, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="log-out" size={28} color={theme.error} />
            </View>
            <ThemedText type="h3" style={styles.modalTitle}>Sign Out</ThemedText>
            <ThemedText style={[styles.modalMessage, { color: theme.textSecondary }]}>
              Are you sure you want to sign out of your account?
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                testID="button-cancel-logout"
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: theme.border }]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <ThemedText style={[styles.modalBtnText, { color: theme.text }]}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                testID="button-confirm-logout"
                style={[styles.modalBtn, styles.confirmBtn, { backgroundColor: theme.error }]}
                onPress={confirmLogout}
              >
                <ThemedText style={[styles.modalBtnText, { color: "#FFFFFF" }]}>Sign Out</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  toast: {
    position: "absolute",
    bottom: 100,
    left: Spacing.xl,
    right: Spacing.xl,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  cancelBtn: {
    borderWidth: 1,
  },
  confirmBtn: {},
  modalBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
