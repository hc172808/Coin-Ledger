import React, { useState, useCallback } from "react";
import { StyleSheet, View, RefreshControl, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { BalanceCard } from "@/components/BalanceCard";
import { QuickAction } from "@/components/QuickAction";
import { SectionHeader } from "@/components/SectionHeader";
import { TransactionItem } from "@/components/TransactionItem";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { MainTabParamList } from "@/navigation/MainTabNavigator";

type HomeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "HomeTab">,
  NativeStackNavigationProp<RootStackParamList>
>;

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
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { wallet, refreshWallet } = useAuth();
  const navigation = useNavigation<HomeNavigationProp>();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transactions] = useState(mockTransactions);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshWallet();
    setIsRefreshing(false);
  }, [refreshWallet]);

  const formatBalance = (balance: string | undefined) => {
    const num = parseFloat(balance || "0");
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.balanceSection}>
        <BalanceCard
          title="Internet Funds"
          balance={formatBalance(wallet?.internetFundsBalance)}
          currency="$"
          icon="globe"
          type="internet"
          onPress={() => navigation.navigate("SendMoney", { fundType: "internet_funds" })}
        />
        <View style={styles.cryptoBalances}>
          <View style={styles.cryptoCard}>
            <BalanceCard
              title="GYD (Stablecoin)"
              balance={formatBalance(wallet?.gydBalance)}
              currency="GYD"
              icon="dollar-sign"
              type="blockchain"
              onPress={() => navigation.navigate("SendMoney", { fundType: "gyd" })}
            />
          </View>
          <View style={styles.cryptoCard}>
            <BalanceCard
              title="GYDS (Gas/Fees)"
              balance={formatBalance(wallet?.gydsBalance)}
              currency="GYDS"
              icon="zap"
              type="gyds"
              onPress={() => navigation.navigate("SendMoney", { fundType: "gyds" })}
            />
          </View>
        </View>
      </View>

      <View style={styles.actionsSection}>
        <QuickAction
          icon="send"
          label="Send"
          variant="primary"
          onPress={() => navigation.navigate("SendMoney", {})}
        />
        <QuickAction
          icon="download"
          label="Receive"
          onPress={() => navigation.navigate("ReceiveMoney")}
        />
        <QuickAction
          icon="file-text"
          label="Request"
          onPress={() => navigation.navigate("RequestMoney")}
        />
        <QuickAction
          icon="maximize"
          label="Scan QR"
          onPress={() => navigation.navigate("QRScanner")}
        />
      </View>

      <SectionHeader
        title="Recent Transactions"
        actionLabel="See All"
        onAction={() => navigation.navigate("TransactionsTab")}
      />

      {transactions.length > 0 ? (
        <View style={styles.transactionsList}>
          {transactions.slice(0, 3).map((tx) => (
            <TransactionItem
              key={tx.id}
              type={tx.type}
              fundType={tx.fundType}
              amount={tx.amount}
              recipient={tx.recipient}
              date={tx.date}
              status={tx.status}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          image={require("../../assets/images/empty-transactions.png")}
          title="No Transactions Yet"
          description="Your transaction history will appear here once you start sending or receiving funds."
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  balanceSection: {
    gap: Spacing.md,
  },
  cryptoBalances: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cryptoCard: {
    flex: 1,
  },
  actionsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Spacing["2xl"],
    marginTop: Spacing.lg,
  },
  transactionsList: {
    gap: Spacing.sm,
  },
});
