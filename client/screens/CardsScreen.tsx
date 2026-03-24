import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Platform,
  Modal,
  Pressable,
  TextInput,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { CardItem } from "@/components/CardItem";
import { EmptyState } from "@/components/EmptyState";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

type Card = {
  id: string;
  lastFourDigits: string;
  expiryDate: string;
  cardType: "virtual" | "physical";
  status: "active" | "frozen" | "pending_approval";
  dailyLimit: string;
};

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const { theme } = useTheme();
  if (!visible) return null;
  return (
    <View
      testID="toast-message"
      pointerEvents="none"
      style={[styles.toast, { backgroundColor: theme.primary }]}
    >
      <ThemedText style={styles.toastText}>{message}</ThemedText>
    </View>
  );
}

export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [cards, setCards] = useState<Card[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [cardType, setCardType] = useState<"virtual" | "physical">("virtual");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  const fetchCards = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/cards");
      const data = await res.json();
      setCards(data);
    } catch (e) {
      console.error("Failed to fetch cards:", e);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchCards();
    setIsRefreshing(false);
  }, [fetchCards]);

  const handleToggleFreeze = async (cardId: string, frozen: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, status: frozen ? "frozen" : "active" } : c
      )
    );
    try {
      await apiRequest("PATCH", `/api/cards/${cardId}/freeze`, { frozen });
      showToast(frozen ? "Card frozen successfully." : "Card activated successfully.");
    } catch (e) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId ? { ...c, status: frozen ? "active" : "frozen" } : c
        )
      );
      showToast("Failed to update card status.");
    }
  };

  const handleCardPress = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    showToast(`Card ending ${card.lastFourDigits} — Daily limit: $${parseFloat(card.dailyLimit).toLocaleString()}`);
  };

  const handleAddCard = () => {
    setCardType("virtual");
    setPin("");
    setPinError("");
    setAddModalVisible(true);
  };

  const submitAddCard = async () => {
    if (pin.length < 4) {
      setPinError("PIN must be at least 4 digits");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/cards", { cardType, pin });
      const newCard = await res.json();
      setCards((prev) => [newCard, ...prev]);
      setAddModalVisible(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showToast(
        cardType === "virtual"
          ? "Virtual card created and ready to use."
          : "Physical card request submitted. Approval pending."
      );
    } catch (e) {
      showToast("Failed to create card. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCard = ({ item }: { item: Card }) => (
    <CardItem
      lastFourDigits={item.lastFourDigits}
      expiryDate={item.expiryDate}
      cardType={item.cardType}
      status={item.status as "active" | "frozen"}
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
    <>
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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        ListFooterComponent={
          cards.length > 0 ? (
            <Pressable
              testID="button-add-card"
              onPress={handleAddCard}
              style={[styles.addButton, { borderColor: theme.primary }]}
            >
              <Feather name="plus" size={18} color={theme.primary} />
              <ThemedText style={[styles.addButtonText, { color: theme.primary }]}>
                Add New Card
              </ThemedText>
            </Pressable>
          ) : null
        }
      />

      <Toast message={toastMsg} visible={toastVisible} />

      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={styles.modalTitle}>
              Add New Card
            </ThemedText>

            <ThemedText style={[styles.modalLabel, { color: theme.textSecondary }]}>
              Card Type
            </ThemedText>
            <View style={styles.typeRow}>
              {(["virtual", "physical"] as const).map((t) => (
                <Pressable
                  key={t}
                  testID={`card-type-${t}`}
                  onPress={() => setCardType(t)}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor:
                        cardType === t ? theme.primary : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <Feather
                    name={t === "virtual" ? "monitor" : "credit-card"}
                    size={16}
                    color={cardType === t ? "#fff" : theme.text}
                  />
                  <ThemedText
                    style={[styles.typeBtnText, { color: cardType === t ? "#fff" : theme.text }]}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {cardType === "physical" ? (
              <View style={[styles.infoBox, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="info" size={14} color={theme.primary} />
                <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
                  Physical cards require admin approval and will be shipped within 5-7 business days.
                </ThemedText>
              </View>
            ) : null}

            <ThemedText style={[styles.modalLabel, { color: theme.textSecondary }]}>
              Set Card PIN
            </ThemedText>
            <TextInput
              testID="input-card-pin"
              style={[
                styles.pinInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: pinError ? theme.error : "transparent",
                },
              ]}
              placeholder="4-6 digit PIN"
              placeholderTextColor={theme.textSecondary}
              value={pin}
              onChangeText={(t) => {
                setPin(t.replace(/\D/g, "").slice(0, 6));
                setPinError("");
              }}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
            {pinError ? (
              <ThemedText style={[styles.errorText, { color: theme.error }]}>{pinError}</ThemedText>
            ) : null}

            <View style={styles.modalButtons}>
              <Pressable
                testID="button-cancel-add-card"
                style={[styles.modalBtn, { borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => setAddModalVisible(false)}
              >
                <ThemedText style={{ color: theme.text, fontWeight: "600" }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                testID="button-confirm-add-card"
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                onPress={submitAddCard}
                disabled={isSubmitting}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                  {isSubmitting ? "Adding..." : "Add Card"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg },
  separator: { height: Spacing.lg },
  emptyList: { flex: 1 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: BorderRadius.lg,
  },
  addButtonText: { fontSize: 15, fontWeight: "600" },
  toast: {
    position: "absolute",
    bottom: 100,
    left: Spacing.xl,
    right: Spacing.xl,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    zIndex: 999,
  },
  toastText: { color: "#fff", fontSize: 14, fontWeight: "500", textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    padding: Spacing.lg,
    paddingBottom: Spacing["2xl"],
  },
  modalCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalTitle: { textAlign: "center", marginBottom: Spacing.sm },
  modalLabel: { fontSize: 13, fontWeight: "500", marginTop: Spacing.sm },
  typeRow: { flexDirection: "row", gap: Spacing.md },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  typeBtnText: { fontSize: 14, fontWeight: "600" },
  infoBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  pinInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 18,
    letterSpacing: 8,
  },
  errorText: { fontSize: 13, marginTop: -Spacing.xs },
  modalButtons: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.md },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
});
