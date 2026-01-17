import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import AuthStackNavigator from "@/navigation/AuthStackNavigator";
import SendMoneyScreen from "@/screens/SendMoneyScreen";
import ReceiveMoneyScreen from "@/screens/ReceiveMoneyScreen";
import RequestMoneyScreen from "@/screens/RequestMoneyScreen";
import QRScannerScreen from "@/screens/QRScannerScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  SendMoney: { fundType?: string; recipient?: string };
  ReceiveMoney: undefined;
  RequestMoney: undefined;
  QRScanner: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SendMoney"
            component={SendMoneyScreen}
            options={{
              headerTitle: "Send Money",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="ReceiveMoney"
            component={ReceiveMoneyScreen}
            options={{
              headerTitle: "Receive Money",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="RequestMoney"
            component={RequestMoneyScreen}
            options={{
              headerTitle: "Request Money",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="QRScanner"
            component={QRScannerScreen}
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
            }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Auth"
          component={AuthStackNavigator}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}
