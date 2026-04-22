import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View, FlatList, Pressable, RefreshControl, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

type Req = {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: string;
  fundType: "internet_funds" | "gyd" | "gyds";
  status: "pending" | "approved" | "declined" | "expired";
  description: string | null;
  expiresAt: string;
  createdAt: string;
};

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const { theme } = useTheme();
  if (!visible) return null;
  return (
    <View testID="toast-message" pointerEvents="none" style={[s.toast, { backgroundColor: theme.primary }]}>
      <ThemedText style={s.toastText}>{message}</ThemedText>
    </View>
  );
}

function formatAmt(amount: string, fund: string) {
  const n = parseFloat(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return fund === "internet_funds" ? `$${n}` : `${n} ${fund.toUpperCase()}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PaymentRequestsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { refreshWallet } = useAuth();

  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (m: string) => {
    setToastMsg(m); setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  const fetchItems = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/payment-requests");
      setItems(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const onRefresh = async () => { setRefreshing(true); await fetchItems(); setRefreshing(false); };

  const handleAction = async (id: string, action: "approve" | "decline") => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActingId(id);
    try {
      await apiRequest("PATCH", `/api/payment-requests/${id}`, { action });
      setItems((prev) => prev.map((r) => r.id === id ? { ...r, status: action === "approve" ? "approved" : "declined" } : r));
      if (action === "approve") await refreshWallet();
      showToast(action === "approve" ? "Payment sent successfully." : "Request declined.");
    } catch (e: any) {
      const raw = e?.message || "";
      showToast(raw.includes(":") ? raw.split(": ").slice(1).join(": ") : "Action failed. Please try again.");
    } finally {
      setActingId(null);
    }
  };

  const renderItem = ({ item }: { item: Req }) => {
    const isPending = item.status === "pending";
    const statusColor = isPending ? theme.warning : item.status === "approved" ? theme.success : theme.error;
    return (
      <View style={[s.card, { backgroundColor: theme.backgroundSecondary }]}>
        <View style={s.row}>
          <View style={[s.iconWrap, { backgroundColor: `${theme.primary}20` }]}>
            <Feather name="arrow-down-left" size={18} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={s.amount}>{formatAmt(item.amount, item.fundType)}</ThemedText>
            <ThemedText style={[s.sub, { color: theme.textSecondary }]} numberOfLines={1}>
              From {item.fromUserId.slice(0, 8)}... · {formatDate(item.createdAt)}
            </ThemedText>
          </View>
          <View style={[s.badge, { backgroundColor: `${statusColor}20` }]}>
            <ThemedText style={[s.badgeText, { color: statusColor }]}>
              {item.status.toUpperCase()}
            </ThemedText>
          </View>
        </View>
        {item.description ? (
          <ThemedText style={[s.desc, { color: theme.textSecondary }]} numberOfLines={2}>
            "{item.description}"
          </ThemedText>
        ) : null}
        {isPending ? (
          <View style={s.actions}>
            <Pressable
              testID={`button-decline-${item.id}`}
              disabled={actingId === item.id}
              style={[s.actionBtn, { borderColor: theme.error, borderWidth: 1.5 }]}
              onPress={() => handleAction(item.id, "decline")}
            >
              <ThemedText style={[s.actionText, { color: theme.error }]}>Decline</ThemedText>
            </Pressable>
            <Pressable
              testID={`button-approve-${item.id}`}
              disabled={actingId === item.id}
              style={[s.actionBtn, { backgroundColor: theme.primary, opacity: actingId === item.id ? 0.6 : 1 }]}
              onPress={() => handleAction(item.id, "approve")}
            >
              <ThemedText style={[s.actionText, { color: "#fff" }]}>
                {actingId === item.id ? "Processing..." : "Pay Now"}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <>
      <FlatList
        style={[s.container, { backgroundColor: theme.backgroundRoot }]}
        data={items}
        renderItem={renderItem}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[
          s.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing["2xl"] },
          items.length === 0 && { flex: 1 },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              image={require("../../assets/images/empty-transactions.png")}
              title="No Requests"
              description="When someone requests payment from you, it will appear here for approval."
            />
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      />
      <Toast message={toastMsg} visible={toastVisible} />
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  card: { borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  amount: { fontSize: 17, fontWeight: "700" },
  sub: { fontSize: 13, marginTop: 2 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  desc: { fontSize: 13, fontStyle: "italic", lineHeight: 18 },
  actions: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.xs },
  actionBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: "center" },
  actionText: { fontWeight: "600", fontSize: 14 },
  toast: {
    position: "absolute", bottom: 40, left: Spacing.xl, right: Spacing.xl,
    borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    alignItems: "center", zIndex: 999,
  },
  toastText: { color: "#fff", fontSize: 14, fontWeight: "500" },
});
