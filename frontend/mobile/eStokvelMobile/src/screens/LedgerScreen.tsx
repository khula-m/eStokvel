import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, StyleSheet, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { Icon, IconName } from '../components/Icon';
import { ProgressBar } from '../components/ProgressBar';
import { showAlert } from '../utils/alert';
import { API_URL } from '../constants/config';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { scaleFontSize } from '../utils/responsive';
import { shadow } from '../utils/shadow';
import { formatCurrency, formatDateShort as formatDate } from '../utils/format';
import { getGroupRole } from '../utils/roles';
import {
  TransactionExplanationSheet,
  TransactionTypeChip,
  sourceBadgeMeta,
} from '../components/TransactionExplanationSheet';
import { AuthState, Transaction, TransactionTypeName, TransactionSourceName } from '../types';

type LedgerTab = 'group' | 'mine' | 'summary';

interface GroupStats {
  totalMembers: number;
  totalBalance: number;
  monthlyTarget: number;
  collectedThisMonth: number;
  pendingTransactions: number;
  totalContributions: number;
  totalPayouts: number;
}

interface GroupMemberSummary {
  id: string;
  user: { id: string; fullName: string; phoneNumber: string };
  role: string;
  paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE';
  lastContributionDate: string | null;
  lastContributionAmount: number | null;
}

// Stokvel transparency rule: ledger visibility is per-GROUP, not per-ROLE.
// Every member of a group reads the same ledger. The only switch is scope —
// the whole group, or just my own contributions.
//
// initialGroupId: when the screen is opened from a group-home Ledger tile,
// the parent passes the group id so we land scoped to that group instead of
// defaulting to the first one in the list.
export const LedgerScreen = ({ auth, initialGroupId, onBack }: { auth: AuthState; initialGroupId?: string | null; onBack?: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<LedgerTab>('group');
  const [groupTx, setGroupTx] = useState<Transaction[]>([]);
  const [myTx, setMyTx] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<GroupStats | null>(null);
  const [members, setMembers] = useState<GroupMemberSummary[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId || null);
  const [filter, setFilter] = useState<'ALL' | 'CONTRIBUTION' | 'PAYOUT'>('ALL');

  // Bottom-sheet state for the "what does this mean?" tap. Holds just the
  // fields the sheet needs to render — the underlying row stays unchanged.
  const [explain, setExplain] = useState<{
    type: TransactionTypeName | string;
    source?: TransactionSourceName;
    notes?: string;
  } | null>(null);

  // When the parent re-routes us to a different group (e.g. user opens
  // another group's Ledger tile), pick that group up. We don't clobber the
  // user's manual selection — only react when `initialGroupId` actually
  // changes to something new.
  useEffect(() => {
    if (initialGroupId && initialGroupId !== selectedGroupId) {
      setSelectedGroupId(initialGroupId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGroupId]);

  // Load the user's groups once. The selected group drives every fetch below.
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const headers = { Authorization: `Bearer ${auth.token}` };
        const res = await axios.get(`${API_URL}/api/groups`, { headers });
        const grps = res.data.data || [];
        setGroups(grps);
        if (grps.length > 0 && !selectedGroupId) setSelectedGroupId(grps[0].id);
      } catch (e) {
        console.error('Groups fetch error:', e);
        showAlert('Error', 'Failed to load groups');
      }
    };
    fetchGroups();
  }, [auth.token]);

  const fetchLedger = useCallback(async () => {
    if (!selectedGroupId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      // All three tabs are populated up-front so switching is instant.
      const [groupRes, myRes, statsRes, membersRes] = await Promise.all([
        // /transactions?stokvelGroupId — the FULL group ledger. Every member
        // of the group is allowed to see this. No role filtering on the server.
        axios.get(`${API_URL}/api/transactions?stokvelGroupId=${selectedGroupId}`, { headers })
          .catch(() => ({ data: { data: { transactions: [] } } })),
        // /transactions/my — just my own contributions/payouts.
        axios.get(`${API_URL}/api/transactions/my`, { headers })
          .catch(() => ({ data: { data: { transactions: [] } } })),
        axios.get(`${API_URL}/api/groups/${selectedGroupId}/stats`, { headers })
          .catch(() => ({ data: { data: null } })),
        axios.get(`${API_URL}/api/groups/${selectedGroupId}/members`, { headers })
          .catch(() => ({ data: { data: [] } })),
      ]);
      const groupData = groupRes.data?.data;
      setGroupTx(Array.isArray(groupData) ? groupData : (groupData?.transactions || []));
      const myData = myRes.data?.data;
      const allMine = Array.isArray(myData) ? myData : (myData?.transactions || []);
      // Scope "Mine" to the selected group, since the user is viewing one group at a time.
      setMyTx(allMine.filter((t: Transaction) => t.stokvelGroupId === selectedGroupId || t.group?.id === selectedGroupId));
      setStats(statsRes.data?.data || null);
      setMembers(membersRes.data?.data || []);
    } catch (e) {
      console.error('Ledger fetch error:', e);
      showAlert('Error', 'Failed to load ledger. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth.token, selectedGroupId]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);
  const onRefresh = () => { setRefreshing(true); fetchLedger(); };

  // Source list for the current tab.
  const baseList: Transaction[] = tab === 'mine' ? myTx : groupTx;
  const filtered = useMemo(
    () => filter === 'ALL' ? baseList : baseList.filter(t => t.transactionType === filter),
    [baseList, filter]
  );

  // Header totals reflect the current tab so the numbers always match the list.
  const headerIn = useMemo(
    () => baseList.filter(t => t.transactionType === 'CONTRIBUTION' && t.status === 'COMPLETED').reduce((s, t) => s + Number(t.amount), 0),
    [baseList]
  );
  const headerOut = useMemo(
    () => baseList.filter(t => t.transactionType === 'PAYOUT' && t.status === 'COMPLETED').reduce((s, t) => s + Number(t.amount), 0),
    [baseList]
  );

  const selectedGroupName = groups.find(g => g.id === selectedGroupId)?.name || 'Ledger';
  const myGroupRole = getGroupRole(auth.user, selectedGroupId);

  if (loading) return <View style={ls.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={ls.container}>
      {/* Gradient Header */}
      <LinearGradient colors={['#0A2463', '#0F3285', '#1A43A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={ls.header}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={ls.backBtnRow}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Back to group"
            accessibilityRole="button"
          >
            <Icon name="arrow-back" size={22} color="#fff" />
            <Text style={ls.backBtnText}>Back to group</Text>
          </TouchableOpacity>
        )}
        <View style={ls.headerRow}>
          <View style={ls.headerIconCircle}>
            <Icon name="menu-book" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={ls.headerTitle} numberOfLines={1} ellipsizeMode="tail">{selectedGroupName}</Text>
            {/* One Text node for the whole subtitle. The previous row layout
                wrapped each child independently, so "Group ledger" was getting
                broken across lines and "ledger" was clipped — leaving "Group"
                / "My" alone, which read like a bug. */}
            <Text style={ls.headerSubtitle} numberOfLines={1} ellipsizeMode="tail">
              {tab === 'group' ? 'Group ledger' : tab === 'mine' ? 'My contributions' : 'Group summary'}
              {myGroupRole === 'ADMIN' ? '  ·  ★ Admin' : ''}
            </Text>
          </View>
        </View>

        <View style={ls.statsRow}>
          <View style={ls.statCard}>
            <View style={[ls.statIcon, { backgroundColor: 'rgba(74,222,128,0.15)' }]}>
              <Icon name="trending-up" size={18} color="#4ADE80" />
            </View>
            <View>
              <Text style={ls.statLabel}>In</Text>
              <Text style={[ls.statValue, { color: '#4ADE80' }]}>{formatCurrency(headerIn)}</Text>
            </View>
          </View>
          <View style={ls.statCard}>
            <View style={[ls.statIcon, { backgroundColor: 'rgba(248,113,113,0.15)' }]}>
              <Icon name="trending-down" size={18} color="#F87171" />
            </View>
            <View>
              <Text style={ls.statLabel}>Out</Text>
              <Text style={[ls.statValue, { color: '#F87171' }]}>{formatCurrency(headerOut)}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tab bar — the three views of the same data. No role gating: every
          member of the group can see every tab. */}
      <View style={ls.tabBar}>
        {([
          { key: 'group', label: 'Group Ledger', icon: 'menu-book' as IconName },
          { key: 'mine', label: 'My Contributions', icon: 'person' as IconName },
          { key: 'summary', label: 'Summary', icon: 'bar-chart' as IconName },
        ] as const).map(t => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[ls.tabBtn, active && ls.tabBtnActive]}
              onPress={() => { setTab(t.key); Haptics.selectionAsync(); }}
              accessibilityRole="tab" accessibilityState={{ selected: active }}
              accessibilityLabel={t.label}>
              <Icon name={t.icon} size={16} color={active ? COLORS.primary : COLORS.textMuted} />
              <Text style={[ls.tabBtnText, active && ls.tabBtnTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Group selector — only meaningful when the user belongs to >1 group. */}
      {groups.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={ls.groupChipRow} contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.sm }}>
          {groups.map(g => {
            const role = getGroupRole(auth.user, g.id);
            const active = selectedGroupId === g.id;
            return (
              <TouchableOpacity key={g.id}
                onPress={() => { setSelectedGroupId(g.id); Haptics.selectionAsync(); }}
                accessibilityLabel={`Select group ${g.name} (you are ${role.toLowerCase()})`} accessibilityRole="button"
                style={[ls.groupChip, active && ls.groupChipActive]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {role === 'ADMIN' && <Icon name="star" size={11} color={active ? '#fff' : COLORS.primary} />}
                  <Text style={[ls.groupChipText, active && ls.groupChipTextActive]} numberOfLines={1}>{g.name}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {tab === 'summary' ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.lg * 2 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
          {/* Financial totals */}
          <View style={ls.summaryCard}>
            <Text style={ls.summaryHeading}>Group Totals</Text>
            <View style={ls.summaryGrid}>
              <View style={ls.summaryItem}>
                <Text style={ls.summaryLabel}>Total contributed</Text>
                <Text style={[ls.summaryValue, { color: COLORS.success }]}>{formatCurrency(stats?.totalContributions || 0)}</Text>
              </View>
              <View style={ls.summaryItem}>
                <Text style={ls.summaryLabel}>Total paid out</Text>
                <Text style={[ls.summaryValue, { color: COLORS.error }]}>{formatCurrency(stats?.totalPayouts || 0)}</Text>
              </View>
              <View style={ls.summaryItem}>
                <Text style={ls.summaryLabel}>Balance</Text>
                <Text style={[ls.summaryValue, { color: COLORS.primary }]}>{formatCurrency(stats?.totalBalance || 0)}</Text>
              </View>
              <View style={ls.summaryItem}>
                <Text style={ls.summaryLabel}>Members</Text>
                <Text style={ls.summaryValue}>{stats?.totalMembers ?? members.length}</Text>
              </View>
            </View>
          </View>

          {/* Monthly target progress */}
          {(stats?.monthlyTarget || 0) > 0 && (
            <View style={ls.summaryCard}>
              <Text style={ls.summaryHeading}>This month</Text>
              {(() => {
                const target = (stats!.monthlyTarget || 0) * (stats!.totalMembers || members.length || 1);
                const collected = stats!.collectedThisMonth || 0;
                const pct = target > 0 ? Math.min((collected / target) * 100, 100) : 0;
                return (
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 13, color: COLORS.textMuted }}>{formatCurrency(collected)} of {formatCurrency(target)}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: pct >= 80 ? COLORS.success : COLORS.warning }}>{Math.round(pct)}%</Text>
                    </View>
                    <ProgressBar progress={pct} color={pct >= 80 ? COLORS.success : COLORS.warning} />
                  </View>
                );
              })()}
            </View>
          )}

          {/* Paid vs unpaid — every member sees this. Transparency by default. */}
          <View style={ls.summaryCard}>
            <Text style={ls.summaryHeading}>Who's paid this period</Text>
            {members.length === 0 ? (
              <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>No member data yet.</Text>
            ) : (
              <>
                <View style={ls.paidCountsRow}>
                  <View style={[ls.paidCountBadge, { backgroundColor: COLORS.accentSoft }]}>
                    <Icon name="check-circle" size={12} color={COLORS.success} />
                    <Text style={[ls.paidCountText, { color: COLORS.success }]}>
                      {members.filter(m => m.paymentStatus === 'PAID').length} paid
                    </Text>
                  </View>
                  <View style={[ls.paidCountBadge, { backgroundColor: COLORS.warningSoft }]}>
                    <Icon name="schedule" size={12} color={COLORS.warning} />
                    <Text style={[ls.paidCountText, { color: COLORS.warning }]}>
                      {members.filter(m => m.paymentStatus === 'PENDING').length} pending
                    </Text>
                  </View>
                  <View style={[ls.paidCountBadge, { backgroundColor: COLORS.errorSoft }]}>
                    <Icon name="warning" size={12} color={COLORS.error} />
                    <Text style={[ls.paidCountText, { color: COLORS.error }]}>
                      {members.filter(m => m.paymentStatus === 'OVERDUE').length} overdue
                    </Text>
                  </View>
                </View>
                {members.map(m => (
                  <View key={m.id} style={ls.memberRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {m.role === 'ADMIN' && <Icon name="star" size={11} color={COLORS.primary} />}
                        <Text style={ls.memberName} numberOfLines={1} ellipsizeMode="tail">{m.user.fullName}</Text>
                      </View>
                      {m.lastContributionDate && (
                        <Text style={ls.memberSub}>Last paid {formatDate(m.lastContributionDate)}</Text>
                      )}
                    </View>
                    <View style={[ls.statusBadge, {
                      backgroundColor:
                        m.paymentStatus === 'PAID' ? COLORS.accentSoft :
                        m.paymentStatus === 'PENDING' ? COLORS.warningSoft : COLORS.errorSoft
                    }]}>
                      <Text style={[ls.statusText, {
                        color:
                          m.paymentStatus === 'PAID' ? COLORS.success :
                          m.paymentStatus === 'PENDING' ? COLORS.warning : COLORS.error
                      }]}>{m.paymentStatus}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        </ScrollView>
      ) : (
        <>
          {/* Filter Tabs — only for ledger lists, not the Summary view. */}
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

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            contentContainerStyle={filtered.length === 0 ? { flex: 1, justifyContent: 'center' } : { paddingBottom: SPACING.lg }}
            ListEmptyComponent={
              <View style={ls.emptyWrap}>
                <View style={ls.emptyIcon}><Icon name="menu-book" size={48} color={COLORS.primary} /></View>
                <Text style={ls.emptyTitle}>No Transactions</Text>
                <Text style={ls.emptyText}>
                  {tab === 'mine' ? 'You have no contributions yet' : 'Group transactions will appear here'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              // Selective source badge — only fires for SYSTEM and
              // SUPERADMIN_ADJUSTMENT, since those are the non-obvious origins
              // where members benefit from a visible flag.
              const srcMeta = sourceBadgeMeta(item.source);
              return (
                <View style={ls.txCard}>
                  <View style={[ls.txIcon, { backgroundColor: item.transactionType === 'CONTRIBUTION' ? COLORS.accentSoft : COLORS.errorSoft }]}>
                    <Icon name={item.transactionType === 'CONTRIBUTION' ? 'trending-up' : 'trending-down' as IconName}
                      size={22} color={item.transactionType === 'CONTRIBUTION' ? COLORS.success : COLORS.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    {/* Group Ledger always shows the contributor's name (every
                        member of the group reads the same book). My
                        Contributions just shows the transaction type chip. */}
                    {tab === 'group' && item.member?.user?.fullName ? (
                      <Text style={ls.txType}>{item.member.user.fullName}</Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                      <TransactionTypeChip
                        transactionType={item.transactionType}
                        onPress={() => setExplain({
                          type: item.transactionType,
                          source: item.source,
                          notes: item.notes,
                        })}
                      />
                      {srcMeta && (
                        <TouchableOpacity
                          onPress={() => setExplain({
                            type: item.transactionType,
                            source: item.source,
                            notes: item.notes,
                          })}
                          style={[ls.sourcePill, { backgroundColor: srcMeta.bg }]}
                          accessibilityLabel={`${srcMeta.label} — tap to learn what this means`}
                          accessibilityRole="button"
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Icon name={srcMeta.icon as IconName} size={10} color={srcMeta.color} />
                          <Text style={[ls.sourcePillText, { color: srcMeta.color }]}>{srcMeta.label}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={[ls.txDate, { marginTop: 4 }]}>{formatDate(item.transactionDate)}</Text>
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
              );
            }}
          />
        </>
      )}

      {/* Bottom-sheet explainer. Mounts once, fed by `explain` state, dismissed
          by tapping the backdrop or the Got-it button. */}
      <TransactionExplanationSheet
        visible={explain !== null}
        onClose={() => setExplain(null)}
        transactionType={explain?.type ?? 'CONTRIBUTION'}
        source={explain?.source}
        notes={explain?.notes}
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
  backBtn: { marginRight: -SPACING.sm },
  backBtnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: SPACING.md, alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
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

  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    gap: SPACING.xs,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
  },
  tabBtnActive: { backgroundColor: COLORS.primarySoft },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  tabBtnTextActive: { color: COLORS.primary },

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

  groupChipRow: { paddingVertical: SPACING.sm, backgroundColor: '#fff', maxHeight: 48 },
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

  // Inline source pill — only renders for SYSTEM / SUPERADMIN_ADJUSTMENT,
  // matching the "selective visibility" rule. Tapping opens the same sheet
  // as the type chip; the sheet shows source + notes when present.
  sourcePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  sourcePillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  txType: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  txDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  txMethod: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  txAmount: { fontSize: scaleFontSize(16), fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.sm, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  summaryCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.md, ...shadow(1, 6, 0.04),
  },
  summaryHeading: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -SPACING.xs },
  summaryItem: { width: '50%', paddingHorizontal: SPACING.xs, paddingVertical: SPACING.xs },
  summaryLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  summaryValue: { fontSize: scaleFontSize(16), fontWeight: '800', color: COLORS.text, marginTop: 2 },

  paidCountsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap' },
  paidCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill },
  paidCountText: { fontSize: 12, fontWeight: '700' },

  memberRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  memberName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  memberSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
