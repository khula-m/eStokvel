import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, fontSize } from '../../theme/spacing';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

interface Member {
  id: string;
  name: string;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  method: string;
  note?: string;
}

interface TreasurerLedgerProps {
  token: string;
  groupId?: string;
  groupName?: string;
  onBack?: () => void;
}

export const TreasurerLedger: React.FC<TreasurerLedgerProps> = ({ token, groupId, groupName = 'Group', onBack }) => {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  };

  const fetchLedgerData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // If no groupId, can't fetch group-specific data
      if (!groupId) {
        setMembers([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch transactions for this group only
      const transRes = await axios.get(`${API_URL}/api/transactions?stokvelGroupId=${groupId}`, { headers });
      const transData = transRes.data.data;
      const allTransactions = Array.isArray(transData) ? transData : (transData?.transactions || []);

      // Filter to ensure only this group's transactions
      const groupTransactions = allTransactions.filter((t: any) => t.stokvelGroupId === groupId);

      // Fetch group members
      const membersRes = await axios.get(`${API_URL}/api/groups/${groupId}/members`, { headers }).catch(() => ({ data: { data: [] } }));
      
      const membersList = membersRes.data.data || [];

      // Group transactions by member
      const memberMap = new Map<string, Member>();
      
      membersList.forEach((member: any) => {
        const userId = member.user?.id || member.userId || member.id;
        const userName = member.user?.fullName || member.fullName || member.name || 'Unknown';
        memberMap.set(userId, {
          id: userId,
          name: userName,
          transactions: [],
        });
      });

      // Assign transactions to members
      groupTransactions.forEach((trans: any) => {
        const memberId = trans.member?.user?.id || trans.memberId || trans.userId;
        const memberName = trans.member?.user?.fullName || 'Unknown';
        
        if (!memberMap.has(memberId)) {
          memberMap.set(memberId, {
            id: memberId,
            name: memberName,
            transactions: [],
          });
        }

        const member = memberMap.get(memberId);
        if (member) {
          member.transactions.push({
            id: trans.id,
            date: new Date(trans.transactionDate).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }),
            amount: trans.amount,
            status: trans.status,
            method: trans.paymentMethod || trans.transactionType,
            note: trans.note,
          });
        }
      });

      setMembers(Array.from(memberMap.values()));

    } catch (error) {
      console.error('Ledger fetch error:', error);
      Alert.alert('Error', 'Failed to load ledger data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLedgerData();
  }, [token, groupId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLedgerData();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading ledger...</Text>
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

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMemberLedger = (member: Member) => (
    <View key={member.id} style={styles.memberSection}>
      <View style={styles.memberHeader}>
        <MaterialIcons name="person" size={20} color={colors.primary} />
        <Text style={styles.memberName}>{member.name}</Text>
        <Text style={styles.memberTotal}>
          Total: {formatCurrency(member.transactions.reduce((sum, t) => sum + t.amount, 0))}
        </Text>
      </View>

      {member.transactions.length === 0 ? (
        <Text style={styles.emptyText}>No transactions yet</Text>
      ) : (
        member.transactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionRow}>
            <View style={styles.transactionLeft}>
              {getStatusIcon(transaction.status)}
              <Text style={styles.transactionDate}>{transaction.date}</Text>
            </View>
            <Text style={styles.transactionAmount}>{formatCurrency(transaction.amount)}</Text>
            <Text style={styles.transactionMethod}>({transaction.method})</Text>
          </View>
        ))
      )}
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Navigation Header */}
      {onBack && (
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Ledger</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <MaterialIcons name="assessment" size={24} color={colors.primary} />
          <Text style={styles.title}>{groupName.toUpperCase()} LEDGER</Text>
        </View>
        <Text style={styles.subtitle}>Complete transaction history for all members</Text>
      </View>

      {/* Filter & Search */}
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
            style={[styles.filterChip, filter === 'month' && styles.filterChipActive]}
            onPress={() => setFilter('month')}
          >
            <Text style={[styles.filterText, filter === 'month' && styles.filterTextActive]}>
              This Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'year' && styles.filterChipActive]}
            onPress={() => setFilter('year')}
          >
            <Text style={[styles.filterText, filter === 'year' && styles.filterTextActive]}>
              This Year
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search member..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.text.secondary}
          />
        </View>
      </View>

      {/* Member Ledgers */}
      <View style={styles.ledgerContent}>
        {filteredMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="person-off" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No members found' : 'No transactions yet'}
            </Text>
          </View>
        ) : (
          filteredMembers.map(renderMemberLedger)
        )}
      </View>

      {/* Export Actions */}
      <View style={styles.exportSection}>
        <TouchableOpacity style={styles.exportButton}>
          <MaterialIcons name="file-download" size={20} color={colors.white} />
          <Text style={styles.exportText}>Export as PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.exportButton, styles.exportButtonSecondary]}>
          <MaterialIcons name="table-chart" size={20} color={colors.primary} />
          <Text style={[styles.exportText, styles.exportTextSecondary]}>Export as CSV</Text>
        </TouchableOpacity>
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
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.text.primary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text.primary,
  },
  ledgerContent: {
    padding: spacing.lg,
  },
  memberSection: {
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
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: spacing.sm,
  },
  memberName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  memberTotal: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.lg,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionDate: {
    fontSize: fontSize.sm,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  transactionAmount: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  transactionMethod: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  exportSection: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  exportButtonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  exportText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.white,
    marginLeft: spacing.sm,
  },
  exportTextSecondary: {
    color: colors.primary,
  },
});
