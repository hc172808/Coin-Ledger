import React, { useState } from "react";
import { StyleSheet, View, FlatList, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";

import { CardItem } from "@/components/CardItem";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

const mockCards = [
  {
    id: "1",
    lastFourDigits: "4532",
    expiryDate: "12/27",
    cardType: "virtual" as const,
    status: "active" as const,
  },
  {
    id: "2",
    lastFourDigits: "8921",
    expiryDate: "06/26",
    cardType: "physical" as const,
    status: "active" as const,
  },
];

export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [cards, setCards] = useState(mockCards);

  const handleToggleFreeze = (cardId: string, frozen: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId
          ? { ...card, status: frozen ? "frozen" : "active" }
          : card
      ) as typeof mockCards
    );

    Alert.alert(
      frozen ? "Card Frozen" : "Card Activated",
      frozen
        ? "This card is now frozen. No transactions can be made."
        : "This card is now active and ready to use."
    );
  };

  const handleCardPress = (cardId: string) => {
    Alert.alert(
      "Card Details",
      "View card details, change PIN, or manage limits.",
      [
        { text: "View Details", onPress: () => {} },
        { text: "Change PIN", onPress: () => {} },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleAddCard = () => {
    Alert.alert(
      "Add New Card",
      "Choose the type of card you want to add.",
      [
        { text: "Virtual Card", onPress: () => {} },
        { text: "Physical Card", onPress: () => {} },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const renderCard = ({ item }: { item: (typeof cards)[0] }) => (
    <CardItem
      lastFourDigits={item.lastFourDigits}
      expiryDate={item.expiryDate}
      cardType={item.cardType}
      status={item.status}
      onToggleFreeze={(frozen) => handleToggleFreeze(item.id, frozen)}
      onPress={() => handleCardPress(item.id)}
    />
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-cards.png")}
      title="No Cards Yet"
      description="Add a virtual or physical card to start making payments securely."
      actionLabel="Add Your First Card"
      onAction={handleAddCard}
    />
  );

  return (
    <FlatList
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      data={cards}
      renderItem={renderCard}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContent,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
        cards.length === 0 && styles.emptyList,
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  separator: {
    height: Spacing.lg,
  },
  emptyList: {
    flex: 1,
  },
});
