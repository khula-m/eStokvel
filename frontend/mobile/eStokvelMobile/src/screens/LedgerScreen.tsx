import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, StyleSheet, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { Icon, IconName } from '../components/Icon';
import { StatsCard } from '../components/StatsCard';
import { showAlert } from '../utils/alert';
import { API_URL } from '../constants/config';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { scaleFontSize } from '../utils/responsive';
import { shadow } from '../utils/shadow';
import { formatCurrency, formatDateShort as formatDate } from '../utils/format';
import { AuthState, Transaction } from '../types';

export const LedgerScreen = ({ auth }: { auth: AuthState }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'CONTRIBUTION' | 'PAYOUT'>('ALL');
  const userRole = auth.user?.role || 'MEMBER';
  const isAdmin = auth.user?.effectiveRole === 'ADMIN' || userRole === 'SUPERADMIN';
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [switchingGroup, setSwitchingGroup] = useState(false);

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

  const totalIn = transactions.filter(t => t.transactionType === 'CONTRIBUTION' && t.status === 'COMPLETED').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = transactions.filter(t => t.transactionType === 'PAYOUT' && t.status === 'COMPLETED').reduce((s, t) => s + Number(t.amount), 0);

  if (loading) return <View style={ls.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={ls.container}>
      {/* Gradient Header */}
      <LinearGradient colors={['#0A2463', '#0F3285', '#1A43A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={ls.header}>
        <View style={ls.headerRow}>
          <View style={ls.headerIconCircle}>
            <Icon name="menu-book" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ls.headerTitle}>Digital Ledger</Text>
            <Text style={ls.headerSubtitle}>{filtered.length} transactions</Text>
          </View>
        </View>

        {/* Summary Stats inside header */}
        <View style={ls.statsRow}>
          <View style={ls.statCard}>
            <View style={[ls.statIcon, { backgroundColor: 'rgba(74,222,128,0.15)' }]}>
              <Icon name="trending-up" size={18} color="#4ADE80" />
            </View>
            <View>
              <Text style={ls.statLabel}>Total In</Text>
              <Text style={[ls.statValue, { color: '#4ADE80' }]}>{formatCurrency(totalIn)}</Text>
            </View>
          </View>
          <View style={ls.statCard}>
            <View style={[ls.statIcon, { backgroundColor: 'rgba(248,113,113,0.15)' }]}>
              <Icon name="trending-down" size={18} color="#F87171" />
            </View>
            <View>
              <Text style={ls.statLabel}>Total Out</Text>
              <Text style={[ls.statValue, { color: '#F87171' }]}>{formatCurrency(totalOut)}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={ls.filterRow}>
        {(['ALL', 'CONTRIBUTION', 'PAYOUT'] as const).map(f => (
          <TouchableOpacity key={f}
            style={[ls.filterBtn, filter === f && ls.filterBtnActive]}
            onPress={() => { setFilter(f); Haptics.selectionAsync(); }}
            accessibilityLabel={`Filter ${f === 'ALL' ? 'all' : f === 'CONTRIBUTION' ? 'contributions' : 'payouts'}`}
            accessibilityRole="button" accessibilityState={{ selected: filter === f }}>
            <Text style={[ls.filterBtnText, filter === f && ls.filterBtnTextActive]}>
              {f === 'ALL' ? 'All' : f === 'CONTRIBUTION' ? 'In' : 'Out'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Admin group selector */}
      {isAdmin && groups.length > 0 && (
        <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: 4 }}>
            {groups.map(g => (
              <TouchableOpacity key={g.id}
                onPress={() => { setSelectedGroupId(g.id); setSwitchingGroup(true); Haptics.selectionAsync(); }}
                accessibilityLabel={`Select group ${g.name}`} accessibilityRole="button"
                style={[ls.groupChip, selectedGroupId === g.id && ls.groupChipActive]}>
                <Text style={[ls.groupChipText, selectedGroupId === g.id && ls.groupChipTextActive]}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' }}>
            {switchingGroup ? 'Loading...' : `${filtered.length} records`}
          </Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        contentContainerStyle={filtered.length === 0 ? { flex: 1, justifyContent: 'center' } : { paddingBottom: SPACING.lg }}
        ListEmptyComponent={
          <View style={ls.emptyWrap}>
            <View style={ls.emptyIcon}><Icon name="menu-book" size={48} color={COLORS.primary} /></View>
            <Text style={ls.emptyTitle}>No Transactions</Text>
            <Text style={ls.emptyText}>{isAdmin ? 'Group transactions will appear here' : 'Your transactions will appear here'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={ls.txCard}>
            <View style={[ls.txIcon, { backgroundColor: item.transactionType === 'CONTRIBUTION' ? COLORS.accentSoft : COLORS.errorSoft }]}>
              <Icon name={item.transactionType === 'CONTRIBUTION' ? 'trending-up' : 'trending-down' as IconName}
                size={22} color={item.transactionType === 'CONTRIBUTION' ? COLORS.success : COLORS.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ls.txType}>
                {isAdmin ? (item.member?.user?.fullName || item.transactionType) : item.transactionType}
              </Text>
              <Text style={ls.txDate}>{formatDate(item.transactionDate)}</Text>
              {item.group && <Text style={ls.txGroup}>{item.group.name}</Text>}
              {item.paymentMethod && (
                <Text style={ls.txMethod}>
                  {item.paymentMethod === 'EFT' ? 'EFT' : item.paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : item.paymentMethod === 'CARD' ? 'Card' : item.paymentMethod === 'OZOW' ? 'Ozow' : item.paymentMethod === 'MOBILE_MONEY' ? 'Mobile Money' : item.paymentMethod}
                  {item.referenceNumber ? ` · Ref: ${item.referenceNumber}` : ''}
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[ls.txAmount, { color: item.transactionType === 'CONTRIBUTION' ? COLORS.success : COLORS.error }]}>
                {item.transactionType === 'CONTRIBUTION' ? '+' : '-'}{formatCurrency(item.amount)}
              </Text>
              <View style={[ls.statusBadge, { backgroundColor: item.status === 'COMPLETED' ? COLORS.accentSoft : COLORS.warningSoft }]}>
                <Text style={[ls.statusText, { color: item.status === 'COMPLETED' ? COLORS.success : COLORS.warning }]}>{item.status}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const ls = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: SPACING.md, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg,
    borderBottomLeftRadius: RADIUS.xxl, borderBottomRightRadius: RADIUS.xxl,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  headerIconCircle: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: scaleFontSize(20), fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: scaleFontSize(12), color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  statCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.lg, padding: SPACING.md,
  },
  statIcon: { width: 36, height: 36, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  statValue: { fontSize: scaleFontSize(16), fontWeight: '800', marginTop: 1 },

  filterRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.md,
    marginTop: SPACING.md, marginBottom: SPACING.sm,
  },
  filterBtn: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface, marginRight: SPACING.sm,
    borderWidth: 1.5, borderColor: COLORS.borderLight,
  },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 },
  filterBtnTextActive: { color: '#fff' },

  groupChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight,
  },
  groupChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  groupChipText: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  groupChipTextActive: { fontWeight: '700', color: '#fff' },

  emptyWrap: { alignItems: 'center', padding: 40 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primarySoft, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg,
  },
  emptyTitle: { fontSize: scaleFontSize(18), fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  emptyText: { fontSize: scaleFontSize(14), color: COLORS.textMuted, textAlign: 'center' },

  txCard: {
    flexDirection: 'row', backgroundColor: '#fff', padding: SPACING.md,
    marginHorizontal: SPACING.md, marginVertical: 4, borderRadius: RADIUS.lg, alignItems: 'center',
    ...shadow(1, 6, 0.04),
  },
  txIcon: { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  txType: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  txDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  txGroup: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  txMethod: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  txAmount: { fontSize: scaleFontSize(16), fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.sm, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
});
