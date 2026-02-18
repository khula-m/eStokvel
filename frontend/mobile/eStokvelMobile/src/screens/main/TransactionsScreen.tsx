import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, fontSize } from '../../theme/spacing';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

interface Transaction {
  id: string;
  transactionType: string;
  amount: number;
  status: string;
  paymentMethod: string;
  transactionDate: string;
  notes?: string;
  group: {
    id: string;
    name: string;
  };
  member: {
    user: {
      fullName: string;
    };
  };
}

type FilterType = 'ALL' | 'CONTRIBUTION' | 'PAYOUT' | 'FINE_PAYMENT';

const TransactionsScreen: React.FC = () => {
  const { token } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('ALL');

  const formatCurrency = (amount: number) => {
    return `R ${Math.abs(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const fetchTransactions = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const url = filter === 'ALL' 
        ? `${API_URL}/api/transactions/my`
        : `${API_URL}/api/transactions/my?transactionType=${filter}`;
      
      const response = await axios.get(url, { headers });
      const data = response.data.data;
      const txns = Array.isArray(data) ? data : (data?.transactions || []);
      setTransactions(txns);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, filter]);

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchTransactions();
    }
  }, [token, filter, fetchTransactions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const getTransactionIcon = (type: string): keyof typeof MaterialIcons.glyphMap => {
    switch (type) {
      case 'CONTRIBUTION': return 'savings';
      case 'PAYOUT': return 'payments';
      case 'FINE_PAYMENT': return 'gavel';
      case 'LOAN_DISBURSEMENT': return 'account-balance';
      case 'LOAN_REPAYMENT': return 'replay';
      default: return 'swap-horiz';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'CONTRIBUTION': return colors.success;
      case 'PAYOUT': return colors.primary;
      case 'FINE_PAYMENT': return colors.warning;
      default: return colors.text.secondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return colors.success;
      case 'PENDING': return colors.warning;
      case 'FAILED': return colors.error;
      case 'CANCELLED': return colors.gray[400];
      default: return colors.text.secondary;
    }
  };

  const getAmountPrefix = (type: string) => {
    switch (type) {
      case 'CONTRIBUTION':
      case 'FINE_PAYMENT':
      case 'LOAN_REPAYMENT':
        return '-';
      case 'PAYOUT':
      case 'LOAN_DISBURSEMENT':
        return '+';
      default:
        return '';
    }
  };

  const filterOptions: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Contributions', value: 'CONTRIBUTION' },
    { label: 'Payouts', value: 'PAYOUT' },
    { label: 'Fines', value: 'FINE_PAYMENT' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterButton, filter === option.value && styles.filterButtonActive]}
              onPress={() => setFilter(option.value)}
            >
              <Text style={[styles.filterText, filter === option.value && styles.filterTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Transactions List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={64} color={colors.gray[300]} />
            <Text style={styles.emptyTitle}>No Transactions</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'ALL' 
                ? 'Your transaction history will appear here'
                : `No ${filter.toLowerCase().replace('_', ' ')} transactions found`}
            </Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <TouchableOpacity key={transaction.id} style={styles.transactionCard} activeOpacity={0.7}>
              <View style={styles.transactionLeft}>
                <View style={[styles.iconContainer, { backgroundColor: getTransactionColor(transaction.transactionType) + '15' }]}>
                  <MaterialIcons
                    name={getTransactionIcon(transaction.transactionType)}
                    size={24}
                    color={getTransactionColor(transaction.transactionType)}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionType}>
                    {transaction.transactionType.replace('_', ' ')}
                  </Text>
                  <Text style={styles.transactionGroup}>{transaction.group?.name || 'Unknown Group'}</Text>
                  <Text style={styles.transactionDate}>{formatDate(transaction.transactionDate)}</Text>
                </View>
              </View>
              <View style={styles.transactionRight}>
                <Text style={[styles.transactionAmount, { color: getTransactionColor(transaction.transactionType) }]}>
                  {getAmountPrefix(transaction.transactionType)}{formatCurrency(transaction.amount)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
                    {transaction.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontSize: fontSize.md,
  },
  filterContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
    marginRight: spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  transactionGroup: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  transactionDate: {
    fontSize: fontSize.xs,
    color: colors.text.disabled,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});

export default TransactionsScreen;
