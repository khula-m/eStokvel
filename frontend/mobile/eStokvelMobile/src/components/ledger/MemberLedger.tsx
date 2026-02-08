import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, fontSize } from '../../theme/spacing';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  method: string;
  note?: string;
}

interface MonthGroup {
  month: string;
  year: string;
  transactions: Transaction[];
  total: number;
}

interface MemberLedgerProps {
  token: string;
  groupId?: string;
  groupName?: string;
  onBack?: () => void;
}

export const MemberLedger: React.FC<MemberLedgerProps> = ({ token, groupId, groupName = 'My', onBack }) => {
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyTransactions, setMonthlyTransactions] = useState<MonthGroup[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);

  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  };

  const fetchMyTransactions = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch only user's transactions
      const transRes = await axios.get(`${API_URL}/api/transactions/my`, { headers });
      const transData = transRes.data.data;
      const transactions = Array.isArray(transData) ? transData : (transData?.transactions || []);

      // Group by month
      const monthMap = new Map<string, MonthGroup>();
      
      transactions.forEach((trans: any) => {
        const date = new Date(trans.transactionDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-ZA', { month: 'long' });
        const year = date.getFullYear().toString();

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, {
            month: monthName,
            year,
            transactions: [],
            total: 0,
          });
        }

        const group = monthMap.get(monthKey)!;
        group.transactions.push({
          id: trans.id,
          date: date.toLocaleDateString('en-ZA', { day: 'numeric' }) + 'th',
          amount: trans.amount,
          status: trans.status,
          method: trans.paymentMethod || trans.transactionType,
          note: trans.note,
        });
        group.total += trans.amount;
      });

      const monthGroups = Array.from(monthMap.values()).sort((a, b) => 
        `${b.year}-${b.month}`.localeCompare(`${a.year}-${a.month}`)
      );

      setMonthlyTransactions(monthGroups);
      setTotalSavings(monthGroups.reduce((sum, g) => sum + g.total, 0));

    } catch (error) {
      console.error('Member ledger fetch error:', error);
      Alert.alert('Error', 'Failed to load your transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyTransactions();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyTransactions();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.info} />
        <Text style={styles.loadingText}>Loading your transactions...</Text>
      </View>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return <MaterialIcons name="check-circle" size={16} color={colors.success} />;
      case 'FAILED':
        return <MaterialIcons name="cancel" size={16} color={colors.error} />;
      case 'PENDING':
        return <MaterialIcons name="warning" size={16} color={colors.warning} />;
      default:
        return null;
    }
  };

  const renderMonthGroup = (group: MonthGroup) => (
    <View key={`${group.month}-${group.year}`} style={styles.monthSection}>
      <View style={styles.monthHeader}>
        <MaterialIcons name="calendar-month" size={20} color={colors.primary} />
        <Text style={styles.monthTitle}>
          {group.month} {group.year}
        </Text>
        <Text style={styles.monthTotal}>{formatCurrency(group.total)}</Text>
      </View>

      {group.transactions.map((transaction) => (
        <View key={transaction.id} style={styles.transactionRow}>
          <View style={styles.transactionLeft}>
            {getStatusIcon(transaction.status)}
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionDate}>{transaction.date}</Text>
              <Text style={styles.transactionMethod}>{transaction.method}</Text>
            </View>
          </View>
          <Text
            style={[
              styles.transactionAmount,
              transaction.status === 'PENDING' && styles.transactionAmountWarning,
            ]}
          >
            {formatCurrency(transaction.amount)}
          </Text>
        </View>
      ))}
    </View>
  );

  const paymentsCount = monthlyTransactions.reduce((sum, g) => sum + g.transactions.length, 0);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.info]} />
      }
    >
      {/* Navigation Header */}
      {onBack && (
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>My Ledger</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <MaterialIcons name="receipt-long" size={24} color={colors.info} />
          <Text style={styles.title}>{groupName.toUpperCase()} TRANSACTIONS</Text>
        </View>
        <Text style={styles.subtitle}>Your personal contribution history</Text>
      </View>

      {/* Filter */}
      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === '2024' && styles.filterChipActive]}
            onPress={() => setFilter('2024')}
          >
            <Text style={[styles.filterText, filter === '2024' && styles.filterTextActive]}>
              2024
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'month' && styles.filterChipActive]}
            onPress={() => setFilter('month')}
          >
            <Text style={[styles.filterText, filter === 'month' && styles.filterTextActive]}>
              This Month
            </Text>
          </TouchableOpacity>
        </View>

        {/* Total Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Saved</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalSavings)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>My Balance in Group</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalSavings)}</Text>
          </View>
        </View>
      </View>

      {/* Transactions by Month */}
      <View style={styles.ledgerContent}>
        {monthlyTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          monthlyTransactions.map(renderMonthGroup)
        )}
      </View>

      {/* Statistics Card */}
      <View style={styles.statsSection}>
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>
            <MaterialIcons name="trending-up" size={18} color={colors.success} /> Your Progress
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{paymentsCount}</Text>
              <Text style={styles.statLabel}>Payments Made</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {paymentsCount > 0 ? '100%' : '0%'}
              </Text>
              <Text style={styles.statLabel}>On-Time Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{monthlyTransactions.length}</Text>
              <Text style={styles.statLabel}>Months Active</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <MaterialIcons name="lock" size={20} color={colors.info} />
          <Text style={styles.infoText}>
            This is your personal transaction history. Only you can see these details.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  navTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.secondary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  header: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  filterSection: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.info,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.text.primary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.white,
  },
  summaryCard: {
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: 'bold',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xs,
  },
  ledgerContent: {
    padding: spacing.lg,
  },
  monthSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: spacing.sm,
  },
  monthTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  monthTotal: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.lg,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionDetails: {
    marginLeft: spacing.sm,
  },
  transactionDate: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    fontWeight: '500',
  },
  transactionMethod: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.success,
  },
  transactionAmountWarning: {
    color: colors.warning,
  },
  infoSection: {
    padding: spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text.primary,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  statsSection: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
