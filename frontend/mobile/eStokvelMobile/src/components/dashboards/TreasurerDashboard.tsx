import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, fontSize } from '../../theme/spacing';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

interface TreasurerDashboardProps {
  user: any;
  token: string;
  groupId?: string;
  groupName?: string;
  groupCode?: string;
  onNavigate?: (screen: string) => void;
}

interface DashboardStats {
  totalCollected: number;
  totalMembers: number;
  activeMembers: number;
  pendingAmount: number;
  pendingCount: number;
  nextPayoutDate?: string;
}

interface Activity {
  id: string;
  type: string;
  member: string;
  amount?: number;
  date: string;
}

export const TreasurerDashboard: React.FC<TreasurerDashboardProps> = ({
  user,
  token,
  groupId,
  groupName = 'Loading...',
  groupCode = 'ABC123',
  onNavigate,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalCollected: 0,
    totalMembers: 0,
    activeMembers: 0,
    pendingAmount: 0,
    pendingCount: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);

  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  };

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // If no groupId, user isn't in a group yet - show empty state
      if (!groupId) {
        setStats({
          totalCollected: 0,
          totalMembers: 0,
          activeMembers: 0,
          pendingAmount: 0,
          pendingCount: 0,
        });
        setActivities([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch transactions and group members
      const [transRes, membersRes] = await Promise.all([
        axios.get(`${API_URL}/api/transactions?stokvelGroupId=${groupId}`, { headers }),
        axios.get(`${API_URL}/api/groups/${groupId}/members`, { headers }).catch(() => ({ data: { data: [] } }))
      ]);

      const transData = transRes.data.data;
      const transactions = Array.isArray(transData) ? transData : (transData?.transactions || []);
      const members = membersRes.data.data || [];

      // Filter transactions by this group only
      const groupTransactions = transactions.filter((t: any) => t.stokvelGroupId === groupId);

      // Calculate stats
      const totalCollected = groupTransactions
        .filter((t: any) => t.transactionType === 'CONTRIBUTION' && t.status === 'COMPLETED')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const pendingTransactions = groupTransactions.filter((t: any) => t.status === 'PENDING');
      const pendingAmount = pendingTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);

      setStats({
        totalCollected,
        totalMembers: members.length,
        activeMembers: members.length, // All members are active by default
        pendingAmount,
        pendingCount: pendingTransactions.length,
      });

      // Recent activities (last 5 transactions) - map member name from nested object
      const recentActivities = groupTransactions.slice(0, 5).map((t: any) => ({
        id: t.id,
        type: t.transactionType,
        member: t.member?.user?.fullName || 'Member',
        amount: t.amount,
        date: new Date(t.transactionDate).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }),
      }));
      setActivities(recentActivities);

    } catch (error: any) {
      console.error('Dashboard fetch error:', error);
      // Handle 403 Forbidden - user doesn't have access
      if (error.response?.status === 403) {
        console.log('Access denied - user may not be a member of this group');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token, groupId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // Show empty state if user has no group
  if (!groupId) {
    return (
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <MaterialIcons name="person" size={24} color={colors.primary} />
            <Text style={styles.welcomeText}>
              Welcome, {user?.fullName?.split(' ')[0] || 'Treasurer'}
            </Text>
          </View>
        </View>
        
        <View style={[styles.container, styles.centered, { paddingTop: 60 }]}>
          <MaterialIcons name="group-add" size={80} color={colors.text.disabled} />
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text.primary, marginTop: 20 }}>
            No Group Yet
          </Text>
          <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center', marginTop: 10, paddingHorizontal: 40 }}>
            You haven't joined any stokvel group yet. Create a new group to start managing as Treasurer!
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: colors.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 8, marginTop: 30 }}
            onPress={() => onNavigate?.('createGroup')}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Create a Group</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ marginTop: 15 }}
            onPress={() => onNavigate?.('joinGroup')}
          >
            <Text style={{ color: colors.primary, fontSize: 14 }}>Or join an existing group</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <MaterialIcons name="person" size={24} color={colors.primary} />
          <Text style={styles.welcomeText}>
            Welcome, {user?.fullName?.split(' ')[0] || 'Treasurer'}
          </Text>
        </View>
        <View style={styles.groupInfo}>
          <MaterialIcons name="description" size={18} color={colors.text.secondary} />
          <Text style={styles.groupText}>
            {groupName} • Code: {groupCode}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <MaterialIcons name="flash-on" size={20} color={colors.primary} /> QUICK ACTIONS
        </Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => onNavigate?.('recordTransaction')}>
            <MaterialIcons name="payments" size={32} color={colors.primary} />
            <Text style={styles.actionText}>Record{'\n'}Transaction</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => onNavigate?.('ledger')}>
            <MaterialIcons name="assessment" size={32} color={colors.secondary} />
            <Text style={styles.actionText}>View{'\n'}Ledger</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => onNavigate?.('addMember')}>
            <MaterialIcons name="group-add" size={32} color={colors.info} />
            <Text style={styles.actionText}>Add{'\n'}Member</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => onNavigate?.('meetings')}>
            <MaterialIcons name="event" size={32} color={colors.warning} />
            <Text style={styles.actionText}>Schedule{'\n'}Meeting</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Financial Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <MaterialIcons name="trending-up" size={20} color={colors.primary} /> FINANCIAL OVERVIEW
        </Text>
        <View style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <MaterialIcons name="account-balance-wallet" size={20} color={colors.success} />
            <View style={styles.overviewText}>
              <Text style={styles.overviewLabel}>Total Collected</Text>
              <Text style={styles.overviewValue}>{formatCurrency(stats.totalCollected)}</Text>
            </View>
          </View>
          <View style={styles.overviewRow}>
            <MaterialIcons name="group" size={20} color={colors.primary} />
            <View style={styles.overviewText}>
              <Text style={styles.overviewLabel}>Members Current</Text>
              <Text style={styles.overviewValue}>{stats.activeMembers}/{stats.totalMembers}</Text>
            </View>
          </View>
          <View style={styles.overviewRow}>
            <MaterialIcons name="calendar-today" size={20} color={colors.warning} />
            <View style={styles.overviewText}>
              <Text style={styles.overviewLabel}>Next Payout</Text>
              <Text style={styles.overviewValue}>{stats.nextPayoutDate || 'Not scheduled'}</Text>
            </View>
          </View>
          <View style={styles.overviewRow}>
            <MaterialIcons name="pending" size={20} color={colors.error} />
            <View style={styles.overviewText}>
              <Text style={styles.overviewLabel}>Pending</Text>
              <Text style={styles.overviewValue}>{formatCurrency(stats.pendingAmount)} ({stats.pendingCount} items)</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <MaterialIcons name="history" size={20} color={colors.primary} /> RECENT ACTIVITY
        </Text>
        <View style={styles.activityCard}>
          {activities.length === 0 ? (
            <Text style={styles.emptyText}>No recent activity</Text>
          ) : (
            activities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <MaterialIcons 
                    name={activity.type === 'CONTRIBUTION' ? 'check-circle' : 'payments'} 
                    size={16} 
                    color={colors.success} 
                  />
                </View>
                <View style={styles.activityText}>
                  <Text style={styles.activityTitle}>
                    {activity.member} {activity.type === 'CONTRIBUTION' ? 'paid' : 'received'} {formatCurrency(activity.amount || 0)}
                  </Text>
                  <Text style={styles.activityTime}>{activity.date}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* FAB for Quick Transaction */}
      <TouchableOpacity style={styles.fab} onPress={() => onNavigate?.('recordTransaction')}>
        <MaterialIcons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </ScrollView>
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
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.secondary,
    fontSize: fontSize.md,
    padding: spacing.lg,
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
  welcomeText: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  groupText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginHorizontal: '1%',
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  overviewText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  overviewLabel: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  overviewValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
