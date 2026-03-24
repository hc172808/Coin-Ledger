import React, { useState, useCallback, useEffect } from "react";
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
import { apiRequest } from "@/lib/query-client";

type HomeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "HomeTab">,
  NativeStackNavigationProp<RootStackParamList>
>;

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

function mapTx(tx: ApiTx) {
  return {
    id: tx.id,
    type: (tx.displayType || tx.type) as "send" | "receive" | "request",
    fundType: tx.fundType as "internet_funds" | "gyd" | "gyds",
    amount: parseFloat(tx.amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    recipient: tx.toAddress || tx.toUserId || "Unknown",
    date: formatDate(tx.createdAt),
    status: tx.status as "completed" | "pending" | "failed",
  };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { wallet, refreshWallet } = useAuth();
  const navigation = useNavigation<HomeNavigationProp>();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<ReturnType<typeof mapTx>[]>([]);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/transactions");
      const data: ApiTx[] = await res.json();
      setTransactions(data.slice(0, 3).map(mapTx));
    } catch (e) {
      console.error("Failed to load transactions:", e);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refreshWallet(), fetchTransactions()]);
    setIsRefreshing(false);
  }, [refreshWallet, fetchTransactions]);

  const formatBalance = (balance: string | undefined) => {
    const num = parseFloat(balance || "0");
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.primary} />
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
          {transactions.map((tx) => (
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
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  balanceSection: { gap: Spacing.md },
  cryptoBalances: { flexDirection: "row", gap: Spacing.md },
  cryptoCard: { flex: 1 },
  actionsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Spacing["2xl"],
    marginTop: Spacing.lg,
  },
  transactionsList: { gap: Spacing.sm },
});
