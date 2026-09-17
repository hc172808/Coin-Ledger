import React, { useState } from "react";
import { StyleSheet, View, Image, Alert, Platform, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { AuthStackParamList } from "@/navigation/AuthStackNavigator";

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Register">;
};

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { register } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [walletMode, setWalletMode] = useState<"later" | "create" | "import" | "external">("later");
  const [walletPrivateKey, setWalletPrivateKey] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!username) newErrors.username = "Username is required";
    else if (username.length < 3) newErrors.username = "Username must be at least 3 characters";
    if (!email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Invalid email format";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters";
    if (!pin) newErrors.pin = "PIN is required";
    else if (pin.length !== 6 || !/^\d+$/.test(pin)) newErrors.pin = "PIN must be 6 digits";
    if (walletMode === "import" && !walletPrivateKey.trim()) newErrors.wallet = "Private key is required";
    if (walletMode === "external" && !/^0x[0-9a-fA-F]{40}$/.test(walletAddress.trim())) newErrors.wallet = "Enter a valid 0x wallet address";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    setIsLoading(true);
    try {
      const result = await register(username, email, password, pin, {
        mode: walletMode,
        ...(walletMode === "import" ? { privateKey: walletPrivateKey.trim() } : {}),
        ...(walletMode === "external" ? { address: walletAddress.trim() } : {}),
      });
      if (result.walletPrivateKey) {
        Alert.alert(
          "Wallet Created — Save Your Private Key",
          `${result.walletPrivateKey}\n\nThis key is shown once. Store it somewhere safe. Anyone with it controls this wallet.`,
        );
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert("Registration Failed", "Could not create your account. Please try again.");
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
          paddingTop: insets.top + Spacing["4xl"],
          paddingBottom: insets.bottom + Spacing["2xl"],
        },
      ]}
    >
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <ThemedText type="h2" style={styles.title}>
          Create Account
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Join GYDS Banking to manage your funds
        </ThemedText>
      </View>

      <View style={styles.form}>
        <Input
          label="Username"
          icon="user"
          placeholder="Choose a username"
          value={username}
          onChangeText={setUsername}
          error={errors.username}
          autoCapitalize="none"
        />

        <Input
          label="Email"
          icon="mail"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Input
          label="Password"
          icon="lock"
          placeholder="Create a password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
        />

        <Input
          label="6-Digit PIN"
          icon="key"
          placeholder="Create a 6-digit PIN"
          value={pin}
          onChangeText={(text) => setPin(text.replace(/[^0-9]/g, "").slice(0, 6))}
          error={errors.pin}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
        />

        <View style={styles.walletSection}>
          <ThemedText type="h3">Wallet setup</ThemedText>
          <ThemedText style={[styles.walletHint, { color: theme.textSecondary }]}>
            Create or connect a wallet now, or set it up later from Profile.
          </ThemedText>
          <View style={styles.walletModes}>
            {([
              ["later", "Set up later"],
              ["create", "Create new"],
              ["import", "Import key"],
              ["external", "Use address"],
            ] as const).map(([value, label]) => (
              <Pressable
                key={value}
                testID={`wallet-mode-${value}`}
                onPress={() => setWalletMode(value)}
                style={[styles.walletMode, { borderColor: walletMode === value ? theme.primary : theme.border, backgroundColor: walletMode === value ? `${theme.primary}16` : theme.backgroundSecondary }]}
              >
                <ThemedText style={{ color: walletMode === value ? theme.primary : theme.text, fontWeight: "600", fontSize: 13 }}>
                  {label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {walletMode === "import" ? (
            <TextInput
              testID="input-wallet-private-key"
              value={walletPrivateKey}
              onChangeText={setWalletPrivateKey}
              placeholder="0x private key"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={[styles.walletInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
            />
          ) : null}
          {walletMode === "external" ? (
            <TextInput
              testID="input-wallet-address"
              value={walletAddress}
              onChangeText={setWalletAddress}
              placeholder="0x wallet address"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.walletInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
            />
          ) : null}
          {errors.wallet ? <ThemedText style={[styles.walletError, { color: theme.error }]}>{errors.wallet}</ThemedText> : null}
        </View>

        <Button onPress={handleRegister} disabled={isLoading} style={styles.button}>
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </View>

      <View style={styles.footer}>
        <ThemedText style={[styles.footerText, { color: theme.textSecondary }]}>
          Already have an account?{" "}
        </ThemedText>
        <ThemedText
          style={[styles.footerLink, { color: theme.primary }]}
          onPress={() => navigation.goBack()}
        >
          Sign In
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
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  form: {
    gap: Spacing.lg,
  },
  walletSection: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  walletHint: {
    fontSize: 13,
    lineHeight: 19,
  },
  walletModes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  walletMode: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: 10,
  },
  walletInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 14,
  },
  walletError: {
    fontSize: 13,
  },
  button: {
    marginTop: Spacing.lg,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: "auto",
    paddingTop: Spacing["3xl"],
  },
  footerText: {
    fontSize: 15,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: "600",
  },
});
