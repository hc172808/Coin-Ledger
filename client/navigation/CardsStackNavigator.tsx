import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { Pressable, Alert } from "react-native";
import { HeaderButton } from "@react-navigation/elements";

import CardsScreen from "@/screens/CardsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";

export type CardsStackParamList = {
  Cards: undefined;
};

const Stack = createNativeStackNavigator<CardsStackParamList>();

export default function CardsStackNavigator() {
  const screenOptions = useScreenOptions();
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Cards"
        component={CardsScreen}
        options={{
          headerTitle: "My Cards",
          headerRight: () => (
            <HeaderButton
              onPress={() => {
                Alert.alert(
                  "Add New Card",
                  "Choose the type of card you want to add.",
                  [
                    { text: "Virtual Card", onPress: () => {} },
                    { text: "Physical Card", onPress: () => {} },
                    { text: "Cancel", style: "cancel" },
                  ]
                );
              }}
            >
              <Feather name="plus" size={22} color={theme.primary} />
            </HeaderButton>
          ),
        }}
      />
    </Stack.Navigator>
  );
}
