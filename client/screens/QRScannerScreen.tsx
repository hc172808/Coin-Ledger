import React, { useState, useEffect } from "react";
import { StyleSheet, View, Platform, Pressable, Linking, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

export default function QRScannerScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Alert.alert(
      "QR Code Scanned",
      `Detected: ${data}`,
      [
        {
          text: "Send Money",
          onPress: () => navigation.replace("SendMoney", { recipient: data }),
        },
        {
          text: "Scan Again",
          onPress: () => setScanned(false),
        },
        { text: "Cancel", style: "cancel", onPress: () => navigation.goBack() },
      ]
    );
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.centeredContent}>
          <ThemedText>Loading camera...</ThemedText>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    if (permission.status === "denied" && !permission.canAskAgain) {
      return (
        <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
          <View style={styles.centeredContent}>
            <Feather name="camera-off" size={64} color={theme.textSecondary} />
            <ThemedText type="h4" style={styles.title}>
              Camera Access Required
            </ThemedText>
            <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
              Please enable camera access in your device settings to scan QR codes.
            </ThemedText>
            {Platform.OS !== "web" ? (
              <Button
                onPress={async () => {
                  try {
                    await Linking.openSettings();
                  } catch (error) {
                    console.error("Could not open settings:", error);
                  }
                }}
                style={styles.button}
              >
                Open Settings
              </Button>
            ) : null}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.centeredContent}>
          <Feather name="camera" size={64} color={theme.textSecondary} />
          <ThemedText type="h4" style={styles.title}>
            Enable Camera
          </ThemedText>
          <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
            We need camera access to scan QR codes for payments and wallet addresses.
          </ThemedText>
          <Button onPress={requestPermission} style={styles.button}>
            Enable Camera
          </Button>
        </View>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.centeredContent}>
          <Feather name="smartphone" size={64} color={theme.textSecondary} />
          <ThemedText type="h4" style={styles.title}>
            Mobile Feature
          </ThemedText>
          <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
            QR code scanning is available on mobile devices. Use Expo Go to access this feature.
          </ThemedText>
          <Button onPress={() => navigation.goBack()} style={styles.button}>
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#000000" }]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <View style={styles.overlay}>
        <View style={[styles.overlayTop, { paddingTop: insets.top }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.scanArea}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
        </View>

        <View style={[styles.overlayBottom, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <ThemedText style={styles.instruction}>
            Point your camera at a QR code to scan
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const SCAN_SIZE = 250;
const CORNER_SIZE = 30;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["3xl"],
  },
  title: {
    marginTop: Spacing.xl,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  button: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing["3xl"],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  overlayTop: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: Spacing.lg,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanArea: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    alignSelf: "center",
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#FFFFFF",
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#FFFFFF",
    borderTopRightRadius: 8,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#FFFFFF",
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#FFFFFF",
    borderBottomRightRadius: 8,
  },
  overlayBottom: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  instruction: {
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
  },
});
