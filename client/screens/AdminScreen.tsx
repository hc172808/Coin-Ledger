import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, Pressable, RefreshControl, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

type Stats = {
  totalUsers: number; frozenUsers: number; adminUsers: number;
  totalTransactions: number; completedTransactions: number;
  totalCards: number; activeCards: number; pendingCards: number; frozenCards: number;
  pendingRequests: number;
  volumeInternetFunds: string; volumeGyd: string; volumeGyds: string;
};
type AdminUser = {
  id: string; username: string; email: string;
  isAdmin: boolean; isFrozen: boolean; twoFactorEnabled: boolean; createdAt: string;
};
type PendingCard = {
  id: string; lastFourDigits: string; cardType: string; expiryDate: string;
  dailyLimit: string; createdAt: string; ownerUsername: string; ownerEmail: string;
};

type Tab = "stats" | "cards" | "users";

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const { theme } = useTheme();
  if (!visible) return null;
  return (
    <View testID="toast-message" pointerEvents="none" style={[s.toast, { backgroundColor: theme.primary }]}>
      <ThemedText style={s.toastText}>{message}</ThemedText>
    </View>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (m: string) => {
    setToastMsg(m); setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [s1, s2, s3] = await Promise.all([
        apiRequest("GET", "/api/admin/stats"),
        apiRequest("GET", "/api/admin/users"),
        apiRequest("GET", "/api/admin/cards/pending"),
      ]);
      setStats(await s1.json());
      setUsers(await s2.json());
      setPendingCards(await s3.json());
    } catch (e) {
      console.error(e);
      showToast("Failed to load admin data.");
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); };

  const toggleFreezeUser = async (u: AdminUser) => {
    if (u.id === user?.id) { showToast("You cannot freeze your own account."); return; }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActingId(u.id);
    const newFrozen = !u.isFrozen;
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isFrozen: newFrozen } : x));
    try {
      await apiRequest("PATCH", `/api/admin/users/${u.id}/freeze`, { frozen: newFrozen });
      showToast(newFrozen ? `${u.username} has been frozen.` : `${u.username} has been unfrozen.`);
      fetchAll();
    } catch (e: any) {
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isFrozen: !newFrozen } : x));
      const raw = e?.message || "";
      showToast(raw.includes(":") ? raw.split(": ").slice(1).join(": ") : "Action failed.");
    } finally { setActingId(null); }
  };

  const decideCard = async (c: PendingCard, approve: boolean) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActingId(c.id);
    try {
      await apiRequest("PATCH", `/api/admin/cards/${c.id}/approve`, { approve });
      setPendingCards((prev) => prev.filter((x) => x.id !== c.id));
      showToast(approve ? "Card approved and activated." : "Card request rejected.");
      fetchAll();
    } catch (e: any) {
      const raw = e?.message || "";
      showToast(raw.includes(":") ? raw.split(": ").slice(1).join(": ") : "Action failed.");
    } finally { setActingId(null); }
  };

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "stats", label: "Stats" },
    { key: "cards", label: "Pending Cards", badge: pendingCards.length },
    { key: "users", label: "Users", badge: users.length },
  ];

  return (
    <View style={[s.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight }]}>
      <View style={s.tabBar}>
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            testID={`admin-tab-${t.key}`}
            onPress={() => setTab(t.key)}
            style={[
              s.tabBtn,
              { backgroundColor: tab === t.key ? theme.primary : theme.backgroundSecondary },
            ]}
          >
            <ThemedText style={[s.tabLabel, { color: tab === t.key ? "#fff" : theme.text }]}>
              {t.label}{t.badge ? ` (${t.badge})` : ""}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + Spacing["2xl"] }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {tab === "stats" && stats ? (
          <>
            <View style={s.statsGrid}>
              <StatCard label="Total Users" value={String(stats.totalUsers)} icon="users" theme={theme} color={theme.primary} />
              <StatCard label="Frozen Users" value={String(stats.frozenUsers)} icon="user-x" theme={theme} color={theme.error} />
              <StatCard label="Admins" value={String(stats.adminUsers)} icon="shield" theme={theme} color={theme.warning} />
              <StatCard label="Pending Cards" value={String(stats.pendingCards)} icon="credit-card" theme={theme} color={theme.warning} />
              <StatCard label="Active Cards" value={String(stats.activeCards)} icon="credit-card" theme={theme} color={theme.success} />
              <StatCard label="Frozen Cards" value={String(stats.frozenCards)} icon="lock" theme={theme} color={theme.error} />
              <StatCard label="Transactions" value={String(stats.completedTransactions)} icon="activity" theme={theme} color={theme.primary} />
              <StatCard label="Pending Requests" value={String(stats.pendingRequests)} icon="inbox" theme={theme} color={theme.warning} />
            </View>
            <ThemedText style={[s.sectionTitle, { marginTop: Spacing.xl }]}>Total Volume Settled</ThemedText>
            <View style={[s.volBox, { backgroundColor: theme.backgroundSecondary }]}>
              <VolRow label="Internet Funds" value={`$${parseFloat(stats.volumeInternetFunds).toLocaleString()}`} theme={theme} />
              <VolRow label="GYD" value={`${parseFloat(stats.volumeGyd).toLocaleString()} GYD`} theme={theme} />
              <VolRow label="GYDS" value={`${parseFloat(stats.volumeGyds).toLocaleString()} GYDS`} theme={theme} />
            </View>
          </>
        ) : null}

        {tab === "cards" ? (
          pendingCards.length === 0 ? (
            <View style={s.emptyWrap}>
              <Feather name="check-circle" size={48} color={theme.success} />
              <ThemedText type="h3" style={{ marginTop: Spacing.lg }}>All caught up</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                No card requests are awaiting approval.
              </ThemedText>
            </View>
          ) : pendingCards.map((c) => (
            <View key={c.id} style={[s.card, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={s.cardRow}>
                <View style={[s.iconWrap, { backgroundColor: `${theme.warning}20` }]}>
                  <Feather name="credit-card" size={18} color={theme.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={s.cardTitle}>•••• {c.lastFourDigits} ({c.cardType})</ThemedText>
                  <ThemedText style={[s.cardSub, { color: theme.textSecondary }]}>
                    {c.ownerUsername} · {c.ownerEmail}
                  </ThemedText>
                  <ThemedText style={[s.cardSub, { color: theme.textSecondary }]}>
                    Daily limit ${parseFloat(c.dailyLimit).toLocaleString()} · Exp {c.expiryDate}
                  </ThemedText>
                </View>
              </View>
              <View style={s.actions}>
                <Pressable
                  testID={`button-reject-card-${c.id}`}
                  disabled={actingId === c.id}
                  style={[s.actionBtn, { borderColor: theme.error, borderWidth: 1.5 }]}
                  onPress={() => decideCard(c, false)}
                >
                  <ThemedText style={[s.actionText, { color: theme.error }]}>Reject</ThemedText>
                </Pressable>
                <Pressable
                  testID={`button-approve-card-${c.id}`}
                  disabled={actingId === c.id}
                  style={[s.actionBtn, { backgroundColor: theme.success, opacity: actingId === c.id ? 0.6 : 1 }]}
                  onPress={() => decideCard(c, true)}
                >
                  <ThemedText style={[s.actionText, { color: "#fff" }]}>
                    {actingId === c.id ? "..." : "Approve"}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ))
        ) : null}

        {tab === "users" ? (
          users.map((u) => (
            <View key={u.id} style={[s.card, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={s.cardRow}>
                <View
                  style={[
                    s.iconWrap,
                    { backgroundColor: u.isFrozen ? `${theme.error}20` : `${theme.primary}20` },
                  ]}
                >
                  <Feather
                    name={u.isAdmin ? "shield" : "user"}
                    size={18}
                    color={u.isFrozen ? theme.error : theme.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
                    <ThemedText style={s.cardTitle}>{u.username}</ThemedText>
                    {u.isAdmin ? (
                      <View style={[s.tag, { backgroundColor: `${theme.warning}30` }]}>
                        <ThemedText style={[s.tagText, { color: theme.warning }]}>ADMIN</ThemedText>
                      </View>
                    ) : null}
                    {u.isFrozen ? (
                      <View style={[s.tag, { backgroundColor: `${theme.error}30` }]}>
                        <ThemedText style={[s.tagText, { color: theme.error }]}>FROZEN</ThemedText>
                      </View>
                    ) : null}
                  </View>
                  <ThemedText style={[s.cardSub, { color: theme.textSecondary }]}>{u.email}</ThemedText>
                  <ThemedText style={[s.cardSub, { color: theme.textSecondary }]}>
                    Joined {new Date(u.createdAt).toLocaleDateString()}
                  </ThemedText>
                </View>
              </View>
              {u.id !== user?.id ? (
                <Pressable
                  testID={`button-toggle-freeze-${u.id}`}
                  disabled={actingId === u.id}
                  style={[
                    s.fullActionBtn,
                    { backgroundColor: u.isFrozen ? theme.success : theme.error, opacity: actingId === u.id ? 0.6 : 1 },
                  ]}
                  onPress={() => toggleFreezeUser(u)}
                >
                  <Feather name={u.isFrozen ? "unlock" : "lock"} size={14} color="#fff" />
                  <ThemedText style={[s.actionText, { color: "#fff" }]}>
                    {actingId === u.id ? "..." : u.isFrozen ? "Unfreeze Account" : "Freeze Account"}
                  </ThemedText>
                </Pressable>
              ) : (
                <View style={[s.fullActionBtn, { backgroundColor: theme.backgroundDefault }]}>
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>This is you</ThemedText>
                </View>
              )}
            </View>
          ))
        ) : null}
      </ScrollView>

      <Toast message={toastMsg} visible={toastVisible} />
    </View>
  );
}

function StatCard({ label, value, icon, theme, color }: any) {
  return (
    <View style={[s.statCard, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[s.statIcon, { backgroundColor: `${color}20` }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <ThemedText style={s.statValue}>{value}</ThemedText>
      <ThemedText style={[s.statLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
    </View>
  );
}

function VolRow({ label, value, theme }: any) {
  return (
    <View style={[s.volRow, { borderBottomColor: theme.border }]}>
      <ThemedText style={{ color: theme.textSecondary }}>{label}</ThemedText>
      <ThemedText style={{ fontWeight: "700" }}>{value}</ThemedText>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: "row", paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.sm },
  tabBtn: { flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md, alignItems: "center" },
  tabLabel: { fontSize: 13, fontWeight: "600" },
  scroll: { padding: Spacing.lg },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  statCard: {
    width: "47%", padding: Spacing.lg, borderRadius: BorderRadius.lg, gap: Spacing.xs,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: Spacing.xs,
  },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "600", marginBottom: Spacing.sm },
  volBox: { borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: 4 },
  volRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  card: { borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.md },
  cardRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardSub: { fontSize: 12, marginTop: 2 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.sm },
  tagText: { fontSize: 9, fontWeight: "700" },
  actions: { flexDirection: "row", gap: Spacing.md },
  actionBtn: { flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md, alignItems: "center" },
  actionText: { fontWeight: "600", fontSize: 13 },
  fullActionBtn: {
    flexDirection: "row", justifyContent: "center", alignItems: "center", gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md,
  },
  emptyWrap: { alignItems: "center", paddingTop: Spacing["3xl"] },
  toast: {
    position: "absolute", bottom: 40, left: Spacing.xl, right: Spacing.xl,
    borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    alignItems: "center", zIndex: 999,
  },
  toastText: { color: "#fff", fontSize: 14, fontWeight: "500" },
});
