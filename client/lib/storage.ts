import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  USER_DATA: "user_data",
  BIOMETRICS_ENABLED: "biometrics_enabled",
  DEVICE_ID: "device_id",
} as const;

async function setSecure(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getSecure(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteSecure(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export async function saveAuthToken(token: string): Promise<void> {
  await setSecure(STORAGE_KEYS.AUTH_TOKEN, token);
}

export async function getAuthToken(): Promise<string | null> {
  return getSecure(STORAGE_KEYS.AUTH_TOKEN);
}

export async function clearAuthToken(): Promise<void> {
  await deleteSecure(STORAGE_KEYS.AUTH_TOKEN);
}

export async function saveUserData(data: object): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
}

export async function getUserData<T>(): Promise<T | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
  return data ? JSON.parse(data) : null;
}

export async function clearUserData(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
}

export async function setBiometricsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRICS_ENABLED, String(enabled));
}

export async function getBiometricsEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRICS_ENABLED);
  return value === "true";
}

export async function getDeviceId(): Promise<string> {
  let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  }
  return deviceId;
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    clearAuthToken(),
    clearUserData(),
    AsyncStorage.removeItem(STORAGE_KEYS.BIOMETRICS_ENABLED),
  ]);
}
