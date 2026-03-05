import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import axios from 'axios';
import { Icon, IconName } from '../components/Icon';
import { StatsCard } from '../components/StatsCard';
import { showAlert } from '../utils/alert';
import { API_URL } from '../constants/config';
import { COLORS } from '../constants/theme';
import { styles } from '../styles';
import { AuthState, Transaction } from '../types';

export const LedgerScreen = ({ auth }: { auth: AuthState }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'CONTRIBUTION' | 'PAYOUT'>('ALL');
  const userRole = auth.user?.role || 'MEMBER';
  // Per-group admin: use effectiveRole or global SUPERADMIN
  const isAdmin = auth.user?.effectiveRole === 'ADMIN' || userRole === 'SUPERADMIN';
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [switchingGroup, setSwitchingGroup] = useState(false);

  // Fetch groups for admin group selector
  useEffect(() => {
    if (!isAdmin) return;
    const fetchGroups = async () => {
      try {
        const headers = { Authorization: `Bearer ${auth.token}` };
        const res = await axios.get(`${API_URL}/api/groups`, { headers });
        const grps = res.data.data || [];
        setGroups(grps);
        if (grps.length > 0) setSelectedGroupId(grps[0].id);
      } catch (e) {
        console.error('Groups fetch error:', e);
        showAlert('Error', 'Failed to load groups');
      }
    };
    fetchGroups();
  }, [auth.token, isAdmin]);

  const fetchTransactions = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      let endpoint = isAdmin ? `${API_URL}/api/transactions` : `${API_URL}/api/transactions/my`;
      if (isAdmin && selectedGroupId) endpoint += `?stokvelGroupId=${selectedGroupId}`;
      const response = await axios.get(endpoint, { headers });
      const td = response.data.data;
      setTransactions(Array.isArray(td) ? td : (td?.transactions || []));
    } catch (error) {
      console.error('Ledger fetch error:', error);
      showAlert('Error', 'Failed to load transactions. Pull down to retry.');
    }
    finally { setLoading(false); setRefreshing(false); setSwitchingGroup(false); }
  }, [auth.token, isAdmin, selectedGroupId]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
  const onRefresh = () => { setRefreshing(true); fetchTransactions(); };

  const filtered = filter === 'ALL' ? transactions : transactions.filter(t => t.transactionType === filter);
  const formatCurrency = (amount: number | string) => `R ${Number(amount || 0).toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });

  const totalIn = transactions.filter(t => t.transactionType === 'CONTRIBUTION' && t.status === 'COMPLETED').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = transactions.filter(t => t.transactionType === 'PAYOUT' && t.status === 'COMPLETED').reduce((s, t) => s + Number(t.amount), 0);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.screenContainer}>
      {/* Header */}
      <View style={styles.ledgerHeader}>
        <Icon name="menu-book" size={24} color={COLORS.primary} />
        <Text style={styles.screenTitle}>Digital Ledger</Text>
      </View>

      {/* Summary Cards */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 12 }}>
        <StatsCard title="Total In" value={formatCurrency(totalIn)} color={COLORS.success} icon="trending-up" />
        <StatsCard title="Total Out" value={formatCurrency(totalOut)} color={COLORS.error} icon="trending-down" />
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {(['ALL', 'CONTRIBUTION', 'PAYOUT'] as const).map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}
            accessibilityLabel={`Filter ${f === 'ALL' ? 'all' : f === 'CONTRIBUTION' ? 'contributions' : 'payouts'}`}
            accessibilityRole="button" accessibilityState={{ selected: filter === f }}>
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f === 'ALL' ? 'All' : f === 'CONTRIBUTION' ? 'In' : 'Out'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Admin group selector */}
      {isAdmin && groups.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            {groups.map(g => (
              <TouchableOpacity
                key={g.id}
                onPress={() => { setSelectedGroupId(g.id); setSwitchingGroup(true); }}
                accessibilityLabel={`Select group ${g.name}`}
                accessibilityRole="button"
                style={{
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                  backgroundColor: selectedGroupId === g.id ? COLORS.primary : '#F3F4F6',
                  borderWidth: 1, borderColor: selectedGroupId === g.id ? COLORS.primary : '#E5E7EB',
                }}>
                <Text style={{ fontSize: 13, fontWeight: selectedGroupId === g.id ? '700' : '500', color: selectedGroupId === g.id ? '#fff' : COLORS.text }}>
                  {g.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ fontSize: 12, color: COLORS.textLight, fontStyle: 'italic' }}>
            {switchingGroup ? 'Loading...' : `${filtered.length} records`}
          </Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: '#EFF6FF' }]}>
              <Icon name="menu-book" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Transactions</Text>
            <Text style={styles.emptyText}>{isAdmin ? 'Group transactions will appear here' : 'Your transactions will appear here'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.transactionCard}>
            <View style={[styles.transactionIcon, { backgroundColor: item.transactionType === 'CONTRIBUTION' ? '#ECFDF5' : '#FFEBEE' }]}>
              <Icon name={item.transactionType === 'CONTRIBUTION' ? 'trending-up' : 'trending-down' as IconName}
                size={24} color={item.transactionType === 'CONTRIBUTION' ? COLORS.success : COLORS.error} />
            </View>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionType}>
                {isAdmin ? (item.member?.user?.fullName || item.transactionType) : item.transactionType}
              </Text>
              <Text style={styles.transactionDate}>{formatDate(item.transactionDate)}</Text>
              {item.group && <Text style={styles.transactionGroup}>{item.group.name}</Text>}
              {item.paymentMethod && (
                <Text style={{ fontSize: 11, color: COLORS.textLight, marginTop: 2 }}>
                  {item.paymentMethod === 'EFT' ? 'EFT' : item.paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : item.paymentMethod === 'CARD' ? 'Card' : item.paymentMethod === 'OZOW' ? 'Ozow' : item.paymentMethod === 'MOBILE_MONEY' ? 'Mobile Money' : item.paymentMethod}
                  {item.referenceNumber ? ` · Ref: ${item.referenceNumber}` : ''}
                </Text>
              )}
            </View>
            <View style={styles.transactionAmountContainer}>
              <Text style={[styles.transactionAmountLarge, { color: item.transactionType === 'CONTRIBUTION' ? COLORS.success : COLORS.error }]}>
                {item.transactionType === 'CONTRIBUTION' ? '+' : '-'}{formatCurrency(item.amount)}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: item.status === 'COMPLETED' ? '#ECFDF5' : '#FFF3E0' }]}>
                <Text style={[styles.statusText, { color: item.status === 'COMPLETED' ? COLORS.success : COLORS.warning }]}>{item.status}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
};
