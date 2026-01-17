import React, { useState } from "react";
import { StyleSheet, View, FlatList, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { FilterChip } from "@/components/FilterChip";
import { TransactionItem } from "@/components/TransactionItem";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

type FilterType = "all" | "internet_funds" | "gyd" | "gyds";

const mockTransactions = [
  {
    id: "1",
    type: "receive" as const,
    fundType: "internet_funds" as const,
    amount: "250.00",
    recipient: "Sarah Johnson",
    date: "Today, 2:30 PM",
    status: "completed" as const,
  },
  {
    id: "2",
    type: "send" as const,
    fundType: "gyd" as const,
    amount: "100.50",
    recipient: "Mike Chen",
    date: "Yesterday",
    status: "completed" as const,
  },
  {
    id: "3",
    type: "request" as const,
    fundType: "gyds" as const,
    amount: "75.00",
    recipient: "Alex Rivera",
    date: "Jan 15",
    status: "pending" as const,
  },
  {
    id: "4",
    type: "send" as const,
    fundType: "internet_funds" as const,
    amount: "500.00",
    recipient: "Jane Doe",
    date: "Jan 14",
    status: "completed" as const,
  },
  {
    id: "5",
    type: "receive" as const,
    fundType: "gyd" as const,
    amount: "1,200.00",
    recipient: "Blockchain Transfer",
    date: "Jan 12",
    status: "completed" as const,
  },
];

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
  const [transactions] = useState(mockTransactions);

  const filteredTransactions = transactions.filter((tx) =>
    activeFilter === "all" ? true : tx.fundType === activeFilter
  );

  const renderTransaction = ({ item }: { item: (typeof transactions)[0] }) => (
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
      <View
        style={[
          styles.filterContainer,
          { paddingTop: headerHeight + Spacing.md },
        ]}
      >
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
          {
            paddingBottom: tabBarHeight + Spacing.xl,
          },
          filteredTransactions.length === 0 && styles.emptyList,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    paddingBottom: Spacing.md,
  },
  filterScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  separator: {
    height: Spacing.sm,
  },
  emptyList: {
    flex: 1,
  },
});
