import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import PaymentRequestsScreen from "@/screens/PaymentRequestsScreen";
import AdminScreen from "@/screens/AdminScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ProfileStackParamList = {
  Profile: undefined;
  PaymentRequests: undefined;
  Admin: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerTitle: "Profile" }}
      />
      <Stack.Screen
        name="PaymentRequests"
        component={PaymentRequestsScreen}
        options={{ headerTitle: "Payment Requests" }}
      />
      <Stack.Screen
        name="Admin"
        component={AdminScreen}
        options={{ headerTitle: "Admin Panel" }}
      />
    </Stack.Navigator>
  );
}
