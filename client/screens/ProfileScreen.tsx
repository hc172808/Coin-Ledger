import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
  Platform,
  TextInput,
  ScrollView,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { SettingsItem } from "@/components/SettingsItem";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";

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

type ModalType =
  | null
  | "change-pin"
  | "change-password"
  | "personal-info"
  | "transaction-limits"
  | "help-center"
  | "contact-support";

const FAQS = [
  {
    q: "What's the difference between Internet Funds, GYD and GYDS?",
    a: "Internet Funds are off-chain dollar balances for everyday transfers. GYD is our on-chain stablecoin pegged 1:1 to the US dollar. GYDS is the gas/fee token used to power transactions on the network.",
  },
  {
    q: "How do I send money to someone?",
    a: "Tap the Send button on the home screen, choose the fund type, enter the recipient's email or wallet address, the amount, then confirm. The transfer is instant.",
  },
  {
    q: "Are my cards safe if my phone is lost?",
    a: "Yes. You can freeze any card instantly from the Cards tab. Frozen cards reject all new transactions. You can also enable Two-Factor Authentication in Security settings.",
  },
  {
    q: "Why is my physical card pending approval?",
    a: "Physical cards require admin verification and are typically approved within 24 hours. You'll receive a notification once it's shipped.",
  },
  {
    q: "How are transaction limits set?",
    a: "Default daily limits apply to every account based on verification level. View your current limits in Account → Transaction Limits.",
  },
];

const TX_LIMITS = [
  { label: "Internet Funds — Daily Send", value: "$10,000.00" },
  { label: "Internet Funds — Per Transaction", value: "$5,000.00" },
  { label: "GYD — Daily Send", value: "10,000.00 GYD" },
  { label: "GYD — Per Transaction", value: "5,000.00 GYD" },
  { label: "GYDS — Daily Send", value: "1,000.00 GYDS" },
  { label: "Card — Daily Spend", value: "$2,500.00" },
  { label: "ATM Withdrawal — Daily", value: "$1,000.00" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, logout, updateProfile } = useAuth();
  const navigation = useNavigation();

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Change PIN
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");

  // Change Password
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");

  // Contact Support
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportError, setSupportError] = useState("");

  // Personal Information (edit)
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCurrentPwd, setEditCurrentPwd] = useState("");
  const [profileError, setProfileError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  const closeModal = () => {
    setActiveModal(null);
    setCurrentPin(""); setNewPin(""); setConfirmPin(""); setPinError("");
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); setPwdError("");
    setSupportSubject(""); setSupportMessage(""); setSupportError("");
    setEditUsername(""); setEditEmail(""); setEditCurrentPwd(""); setProfileError("");
  };

  const openPersonalInfo = () => {
    setEditUsername(user?.username ?? "");
    setEditEmail(user?.email ?? "");
    setEditCurrentPwd("");
    setProfileError("");
    setActiveModal("personal-info");
  };

  const submitProfile = async () => {
    setProfileError("");
    const trimmedUsername = editUsername.trim();
    const trimmedEmail = editEmail.trim();
    if (trimmedUsername.length < 3) return setProfileError("Username must be at least 3 characters");
    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUsername)) return setProfileError("Username can only contain letters, numbers, dots, underscores and hyphens");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return setProfileError("Enter a valid email address");
    const noChange = trimmedUsername === user?.username && trimmedEmail.toLowerCase() === user?.email?.toLowerCase();
    if (noChange) {
      closeModal();
      showToast("No changes to save.");
      return;
    }
    if (!editCurrentPwd) return setProfileError("Enter your current password to confirm changes");
    setSubmitting(true);
    try {
      await updateProfile({ username: trimmedUsername, email: trimmedEmail, currentPassword: editCurrentPwd });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
      showToast("Profile updated.");
    } catch (e: any) {
      const raw = e?.message || "";
      setProfileError(raw.includes(":") ? raw.split(": ").slice(1).join(": ") : "Could not update profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle2FA = async (enabled: boolean) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTwoFactorEnabled(enabled);
    showToast(enabled ? "Two-factor authentication enabled." : "Two-factor authentication disabled.");
  };

  const handleToggleBiometrics = async (enabled: boolean) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBiometricsEnabled(enabled);
    showToast(enabled ? "Biometric login enabled." : "Biometric login disabled.");
  };

  const submitChangePin = async () => {
    setPinError("");
    if (currentPin.length < 4) return setPinError("Enter your current PIN");
    if (newPin.length < 4) return setPinError("New PIN must be at least 4 digits");
    if (newPin !== confirmPin) return setPinError("New PIN and confirmation don't match");
    setSubmitting(true);
    try {
      await apiRequest("PATCH", "/api/auth/change-pin", { currentPin, newPin });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
      showToast("PIN changed successfully.");
    } catch (e: any) {
      const raw = e?.message || "";
      setPinError(raw.includes(":") ? raw.split(": ").slice(1).join(": ") : "Could not change PIN. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitChangePassword = async () => {
    setPwdError("");
    if (!currentPwd) return setPwdError("Enter your current password");
    if (newPwd.length < 8) return setPwdError("New password must be at least 8 characters");
    if (newPwd !== confirmPwd) return setPwdError("New password and confirmation don't match");
    setSubmitting(true);
    try {
      await apiRequest("PATCH", "/api/auth/change-password", {
        currentPassword: currentPwd,
        newPassword: newPwd,
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
      showToast("Password changed successfully.");
    } catch (e: any) {
      const raw = e?.message || "";
      setPwdError(raw.includes(":") ? raw.split(": ").slice(1).join(": ") : "Could not change password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitContactSupport = async () => {
    setSupportError("");
    if (!supportSubject.trim()) return setSupportError("Subject is required");
    if (supportMessage.trim().length < 10) return setSupportError("Please describe your issue (10+ characters)");
    setSubmitting(true);
    try {
      const subject = encodeURIComponent(`[GYDS Support] ${supportSubject.trim()}`);
      const body = encodeURIComponent(
        `${supportMessage.trim()}\n\n---\nFrom: ${user?.username} (${user?.email})\nUser ID: ${user?.id}`
      );
      const url = `mailto:support@gydsbanking.com?subject=${subject}&body=${body}`;
      const can = await Linking.canOpenURL(url).catch(() => false);
      if (can) await Linking.openURL(url);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
      showToast(can ? "Opening your mail app..." : "Message logged. We'll respond within 24h.");
    } catch (e) {
      setSupportError("Could not send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => setLogoutModalVisible(true);
  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await logout();
  };

  const goToCards = () => {
    const parent = navigation.getParent();
    if (parent) parent.navigate("CardsTab" as never);
    else showToast("Open the Cards tab below to manage cards.");
  };

  return (
    <>
      <KeyboardAwareScrollViewCompat
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.profileHeader}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </ThemedText>
          </View>
          <ThemedText type="h3" style={styles.username} testID="text-username">
            {user?.username ?? ""}
          </ThemedText>
          <ThemedText style={[styles.email, { color: theme.textSecondary }]} testID="text-email">
            {user?.email ?? ""}
          </ThemedText>
        </View>

        <SectionHeader title="Security" />
        <View style={styles.settingsGroup}>
          <SettingsItem
            icon="shield" label="Two-Factor Authentication"
            hasSwitch switchValue={twoFactorEnabled} onSwitchChange={handleToggle2FA}
          />
          <SettingsItem
            icon="smartphone" label="Biometric Login"
            value={biometricsEnabled ? "Enabled" : "Disabled"}
            hasSwitch switchValue={biometricsEnabled} onSwitchChange={handleToggleBiometrics}
          />
          <SettingsItem icon="key" label="Change PIN" onPress={() => setActiveModal("change-pin")} />
          <SettingsItem icon="lock" label="Change Password" onPress={() => setActiveModal("change-password")} />
        </View>

        <SectionHeader title="Account" />
        <View style={styles.settingsGroup}>
          <SettingsItem icon="user" label="Personal Information" onPress={openPersonalInfo} />
          <SettingsItem icon="inbox" label="Payment Requests" onPress={() => (navigation as any).navigate("PaymentRequests")} />
          <SettingsItem icon="credit-card" label="Payment Methods" onPress={goToCards} />
          <SettingsItem icon="file-text" label="Transaction Limits" onPress={() => setActiveModal("transaction-limits")} />
        </View>

        {(user as any)?.isAdmin ? (
          <>
            <SectionHeader title="Administration" />
            <View style={styles.settingsGroup}>
              <SettingsItem icon="shield" label="Admin Panel" onPress={() => (navigation as any).navigate("Admin")} />
            </View>
          </>
        ) : null}

        <SectionHeader title="Support" />
        <View style={styles.settingsGroup}>
          <SettingsItem icon="help-circle" label="Help Center" onPress={() => setActiveModal("help-center")} />
          <SettingsItem icon="message-circle" label="Contact Support" onPress={() => setActiveModal("contact-support")} />
          <SettingsItem icon="info" label="About GYDS Banking" value="Version 1.0.0" onPress={() => showToast("GYDS Banking v1.0.0")} />
        </View>

        <View style={[styles.settingsGroup, { marginTop: Spacing["2xl"] }]}>
          <SettingsItem icon="log-out" label="Sign Out" destructive onPress={handleLogout} />
        </View>
      </KeyboardAwareScrollViewCompat>

      <Toast message={toastMessage} visible={toastVisible} />

      {/* Logout */}
      <Modal visible={logoutModalVisible} transparent animationType="fade" onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View testID="logout-modal" style={[styles.modalCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.modalIconWrap, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="log-out" size={28} color={theme.error} />
            </View>
            <ThemedText type="h3" style={styles.modalTitle}>Sign Out</ThemedText>
            <ThemedText style={[styles.modalMessage, { color: theme.textSecondary }]}>
              Are you sure you want to sign out of your account?
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable testID="button-cancel-logout" style={[styles.modalBtn, styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setLogoutModalVisible(false)}>
                <ThemedText style={[styles.modalBtnText, { color: theme.text }]}>Cancel</ThemedText>
              </Pressable>
              <Pressable testID="button-confirm-logout" style={[styles.modalBtn, { backgroundColor: theme.error }]} onPress={confirmLogout}>
                <ThemedText style={[styles.modalBtnText, { color: "#FFFFFF" }]}>Sign Out</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change PIN */}
      <Modal visible={activeModal === "change-pin"} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={styles.sheetTitle}>Change PIN</ThemedText>
            <PinField label="Current PIN" value={currentPin} onChange={setCurrentPin} testID="input-current-pin" theme={theme} />
            <PinField label="New PIN" value={newPin} onChange={setNewPin} testID="input-new-pin" theme={theme} />
            <PinField label="Confirm New PIN" value={confirmPin} onChange={setConfirmPin} testID="input-confirm-pin" theme={theme} />
            {pinError ? <ThemedText style={[styles.errText, { color: theme.error }]}>{pinError}</ThemedText> : null}
            <SheetActions onCancel={closeModal} onSubmit={submitChangePin} submitLabel={submitting ? "Saving..." : "Update PIN"} disabled={submitting} theme={theme} testIDPrefix="change-pin" />
          </View>
        </View>
      </Modal>

      {/* Change Password */}
      <Modal visible={activeModal === "change-password"} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={styles.sheetTitle}>Change Password</ThemedText>
            <PwdField label="Current Password" value={currentPwd} onChange={setCurrentPwd} testID="input-current-password" theme={theme} />
            <PwdField label="New Password" value={newPwd} onChange={setNewPwd} testID="input-new-password" theme={theme} />
            <PwdField label="Confirm New Password" value={confirmPwd} onChange={setConfirmPwd} testID="input-confirm-password" theme={theme} />
            {pwdError ? <ThemedText style={[styles.errText, { color: theme.error }]}>{pwdError}</ThemedText> : null}
            <SheetActions onCancel={closeModal} onSubmit={submitChangePassword} submitLabel={submitting ? "Saving..." : "Update Password"} disabled={submitting} theme={theme} testIDPrefix="change-password" />
          </View>
        </View>
      </Modal>

      {/* Personal Information */}
      <Modal visible={activeModal === "personal-info"} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={styles.sheetTitle}>Personal Information</ThemedText>

            <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Username</ThemedText>
            <TextInput
              testID="input-username"
              value={editUsername}
              onChangeText={setEditUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={32}
              placeholder="your_username"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
            />

            <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</ThemedText>
            <TextInput
              testID="input-email"
              value={editEmail}
              onChangeText={setEditEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
            />

            <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Confirm with Current Password</ThemedText>
            <TextInput
              testID="input-confirm-password"
              value={editCurrentPwd}
              onChangeText={setEditCurrentPwd}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              placeholder="Required to save changes"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
            />

            {profileError ? (
              <ThemedText testID="text-profile-error" style={[styles.errText, { color: theme.error }]}>{profileError}</ThemedText>
            ) : null}

            <View style={[styles.infoBox, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="info" size={14} color={theme.primary} />
              <ThemedText style={[styles.infoBoxText, { color: theme.textSecondary }]}>
                Account ID {user?.id?.slice(0, 12)}…  ·  {(user as any)?.isAdmin ? "Administrator" : "Standard User"}  ·  2FA {twoFactorEnabled ? "On" : "Off"}
              </ThemedText>
            </View>

            <SheetActions
              onCancel={closeModal}
              onSubmit={submitProfile}
              submitLabel={submitting ? "Saving..." : "Save Changes"}
              disabled={submitting}
              theme={theme}
              testIDPrefix="personal-info"
            />
          </View>
        </View>
      </Modal>

      {/* Transaction Limits */}
      <Modal visible={activeModal === "transaction-limits"} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: theme.backgroundDefault, maxHeight: "85%" }]}>
            <ThemedText type="h3" style={styles.sheetTitle}>Transaction Limits</ThemedText>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {TX_LIMITS.map((l) => <InfoRow key={l.label} label={l.label} value={l.value} theme={theme} />)}
            </ScrollView>
            <View style={[styles.infoBox, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="info" size={14} color={theme.primary} />
              <ThemedText style={[styles.infoBoxText, { color: theme.textSecondary }]}>
                Limits reset daily at 00:00 UTC. Contact support to request a higher tier.
              </ThemedText>
            </View>
            <Pressable testID="button-close-limits" style={[styles.fullBtn, { backgroundColor: theme.primary }]} onPress={closeModal}>
              <ThemedText style={styles.fullBtnText}>Close</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Help Center */}
      <Modal visible={activeModal === "help-center"} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: theme.backgroundDefault, maxHeight: "85%" }]}>
            <ThemedText type="h3" style={styles.sheetTitle}>Help Center</ThemedText>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
              {FAQS.map((f, i) => (
                <View key={i} style={[styles.faqItem, { borderBottomColor: theme.border }]}>
                  <ThemedText style={styles.faqQ}>{f.q}</ThemedText>
                  <ThemedText style={[styles.faqA, { color: theme.textSecondary }]}>{f.a}</ThemedText>
                </View>
              ))}
            </ScrollView>
            <Pressable testID="button-close-help" style={[styles.fullBtn, { backgroundColor: theme.primary }]} onPress={closeModal}>
              <ThemedText style={styles.fullBtnText}>Close</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Contact Support */}
      <Modal visible={activeModal === "contact-support"} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={styles.sheetTitle}>Contact Support</ThemedText>
            <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Subject</ThemedText>
            <TextInput
              testID="input-support-subject"
              value={supportSubject}
              onChangeText={setSupportSubject}
              placeholder="Brief summary"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
            />
            <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Message</ThemedText>
            <TextInput
              testID="input-support-message"
              value={supportMessage}
              onChangeText={setSupportMessage}
              placeholder="Describe your issue or question..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={5}
              style={[styles.input, styles.inputMulti, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
            />
            {supportError ? <ThemedText style={[styles.errText, { color: theme.error }]}>{supportError}</ThemedText> : null}
            <View style={[styles.infoBox, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="mail" size={14} color={theme.primary} />
              <ThemedText style={[styles.infoBoxText, { color: theme.textSecondary }]}>
                We respond within 24 hours. For urgent card issues, freeze your card from the Cards tab first.
              </ThemedText>
            </View>
            <SheetActions onCancel={closeModal} onSubmit={submitContactSupport} submitLabel={submitting ? "Sending..." : "Send Message"} disabled={submitting} theme={theme} testIDPrefix="support" />
          </View>
        </View>
      </Modal>
    </>
  );
}

function PinField({ label, value, onChange, testID, theme }: any) {
  return (
    <>
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={(t: string) => onChange(t.replace(/\D/g, "").slice(0, 6))}
        placeholder="••••"
        placeholderTextColor={theme.textSecondary}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, letterSpacing: 8, fontSize: 18 }]}
      />
    </>
  );
}

function PwdField({ label, value, onChange, testID, theme }: any) {
  return (
    <>
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        placeholder="Enter password"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        autoCapitalize="none"
        style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
      />
    </>
  );
}

function InfoRow({ label, value, theme }: any) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
      <ThemedText style={[styles.infoRowLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
      <ThemedText style={styles.infoRowValue} numberOfLines={1}>{value}</ThemedText>
    </View>
  );
}

function SheetActions({ onCancel, onSubmit, submitLabel, disabled, theme, testIDPrefix }: any) {
  return (
    <View style={styles.modalButtons}>
      <Pressable
        testID={`button-cancel-${testIDPrefix}`}
        style={[styles.modalBtn, styles.cancelBtn, { borderColor: theme.border }]}
        onPress={onCancel}
      >
        <ThemedText style={[styles.modalBtnText, { color: theme.text }]}>Cancel</ThemedText>
      </Pressable>
      <Pressable
        testID={`button-submit-${testIDPrefix}`}
        style={[styles.modalBtn, { backgroundColor: theme.primary, opacity: disabled ? 0.6 : 1 }]}
        onPress={onSubmit}
        disabled={disabled}
      >
        <ThemedText style={[styles.modalBtnText, { color: "#FFFFFF" }]}>{submitLabel}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  profileHeader: { alignItems: "center", marginBottom: Spacing.xl },
  avatarContainer: {
    width: 80, height: 80, borderRadius: BorderRadius.full,
    alignItems: "center", justifyContent: "center", marginBottom: Spacing.md,
  },
  avatarText: { fontSize: 32, fontWeight: "600", color: "#FFFFFF" },
  username: { marginBottom: Spacing.xs },
  email: { fontSize: 15 },
  settingsGroup: { gap: Spacing.sm },
  toast: {
    position: "absolute", bottom: 100, left: Spacing.xl, right: Spacing.xl,
    borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    alignItems: "center", zIndex: 999,
  },
  toastText: { color: "#FFFFFF", fontSize: 14, fontWeight: "500", textAlign: "center" },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", padding: Spacing.xl,
  },
  modalCard: {
    width: "100%", borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: "center",
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: BorderRadius.full,
    alignItems: "center", justifyContent: "center", marginBottom: Spacing.lg,
  },
  modalTitle: { marginBottom: Spacing.sm, textAlign: "center" },
  modalMessage: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: Spacing.xl },
  modalButtons: { flexDirection: "row", gap: Spacing.md, width: "100%", marginTop: Spacing.md },
  modalBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: "center" },
  cancelBtn: { borderWidth: 1 },
  modalBtnText: { fontSize: 15, fontWeight: "600" },
  sheetOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl, paddingBottom: Spacing["2xl"], gap: Spacing.sm,
  },
  sheetTitle: { textAlign: "center", marginBottom: Spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: "500", marginTop: Spacing.sm, marginBottom: 4 },
  input: {
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md, fontSize: 15,
  },
  inputMulti: { minHeight: 100, textAlignVertical: "top", paddingTop: Spacing.md },
  errText: { fontSize: 13, marginTop: Spacing.xs },
  infoBox: {
    flexDirection: "row", gap: Spacing.sm, padding: Spacing.md,
    borderRadius: BorderRadius.md, alignItems: "flex-start", marginTop: Spacing.sm,
  },
  infoBoxText: { flex: 1, fontSize: 13, lineHeight: 18 },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoRowLabel: { fontSize: 14, flex: 1 },
  infoRowValue: { fontSize: 14, fontWeight: "600", flex: 1, textAlign: "right" },
  fullBtn: {
    paddingVertical: Spacing.md, borderRadius: BorderRadius.lg,
    alignItems: "center", marginTop: Spacing.md,
  },
  fullBtnText: { color: "#FFF", fontWeight: "600", fontSize: 15 },
  faqItem: { paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  faqQ: { fontSize: 15, fontWeight: "600", marginBottom: 6 },
  faqA: { fontSize: 14, lineHeight: 20 },
});
