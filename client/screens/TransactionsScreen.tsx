import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, View, FlatList, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { FilterChip } from "@/components/FilterChip";
import { TransactionItem } from "@/components/TransactionItem";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

type FilterType = "all" | "internet_funds" | "gyd" | "gyds";

type ApiTx = {
  id: string;
  fromUserId: string;
  toUserId: string | null;
  toAddress: string | null;
  type: string;
  displayType: string;
  fundType: string;
  amount: string;
  status: string;
  createdAt: string;
};

type MappedTx = {
  id: string;
  type: "send" | "receive" | "request";
  fundType: "internet_funds" | "gyd" | "gyds";
  amount: string;
  recipient: string;
  date: string;
  status: "completed" | "pending" | "failed";
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days === 0) {
    return `Today, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  }
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function mapTx(tx: ApiTx): MappedTx {
  return {
    id: tx.id,
    type: (tx.displayType || tx.type) as MappedTx["type"],
    fundType: tx.fundType as MappedTx["fundType"],
    amount: parseFloat(tx.amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    recipient: tx.toAddress || tx.toUserId || "Unknown",
    date: formatDate(tx.createdAt),
    status: tx.status as MappedTx["status"],
  };
}

const filters: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Internet Funds", value: "internet_funds" },
  { label: "GYD", value: "gyd" },
  { label: "GYDS", value: "gyds" },
];

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [allTransactions, setAllTransactions] = useState<MappedTx[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/transactions");
      const data: ApiTx[] = await res.json();
      setAllTransactions(data.map(mapTx));
    } catch (e) {
      console.error("Failed to load transactions:", e);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchTransactions();
    setIsRefreshing(false);
  }, [fetchTransactions]);

  const filteredTransactions =
    activeFilter === "all" ? allTransactions : allTransactions.filter((tx) => tx.fundType === activeFilter);

  const renderTransaction = ({ item }: { item: MappedTx }) => (
    <TransactionItem
      type={item.type}
      fundType={item.fundType}
      amount={item.amount}
      recipient={item.recipient}
      date={item.date}
      status={item.status}
    />
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-transactions.png")}
      title="No Transactions"
      description="Transactions matching your filter will appear here."
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.filterContainer, { paddingTop: headerHeight + Spacing.md }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filters.map((filter) => (
            <FilterChip
              key={filter.value}
              label={filter.label}
              isSelected={activeFilter === filter.value}
              onPress={() => setActiveFilter(filter.value)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl },
          filteredTransactions.length === 0 && styles.emptyList,
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterContainer: { paddingBottom: Spacing.md },
  filterScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  listContent: { paddingHorizontal: Spacing.lg },
  separator: { height: Spacing.sm },
  emptyList: { flex: 1 },
});
