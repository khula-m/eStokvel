import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, fontSize } from '../../theme/spacing';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

interface MemberDashboardProps {
  user: any;
  token: string;
  groupId?: string;
  groupName?: string;
  onNavigate?: (screen: string) => void;
}

interface MemberStats {
  myTotal: number;
  nextDue: number;
  nextDueDate?: string;
  paymentStreak: number;
  ranking: string;
  contributionFrequency?: string;
  meetingSchedule?: string;
  payoutDate?: string;
  memberCount?: number;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  user,
  token,
  groupId,
  groupName = 'No Group',
  onNavigate,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasGroup, setHasGroup] = useState(false);
  const [stats, setStats] = useState<MemberStats>({
    myTotal: 0,
    nextDue: 0,
    paymentStreak: 0,
    ranking: 'N/A',
  });

  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  };

  const fetchMemberData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Check if user has any groups
      if (!groupId) {
        setHasGroup(false);
        setStats({
          myTotal: 0,
          nextDue: 0,
          paymentStreak: 0,
          ranking: 'N/A',
        });
        setLoading(false);
        return;
      }
      
      setHasGroup(true);
      
      // Fetch group details to get contribution amount, and user's transactions
      const [groupRes, transRes] = await Promise.all([
        axios.get(`${API_URL}/api/groups/${groupId}`, { headers }).catch(() => ({ data: { data: null } })),
        axios.get(`${API_URL}/api/transactions/my`, { headers }).catch(() => ({ data: { data: { transactions: [] } } }))
      ]);
      
      const groupData = groupRes.data.data;
      const contributionAmount = groupData?.contributionAmount || 0;
      const contributionFrequency = groupData?.contributionFrequency || 'MONTHLY';
      const meetingSchedule = groupData?.meetingSchedule || null;
      const payoutDate = groupData?.payoutDate || null;
      const memberCount = groupData?._count?.members || groupData?.members?.length || 0;
      
      const transData = transRes.data.data;
      const transactions = Array.isArray(transData) ? transData : (transData?.transactions || []);

      // Filter by groupId if provided
      const groupTransactions = groupId 
        ? transactions.filter((t: any) => t.stokvelGroupId === groupId)
        : transactions;

      // Calculate personal stats
      const myContributions = groupTransactions
        .filter((t: any) => t.transactionType === 'CONTRIBUTION' && t.status === 'COMPLETED')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      // Calculate payment streak (consecutive months paid)
      const paidMonths = new Set(
        groupTransactions
          .filter((t: any) => t.status === 'COMPLETED')
          .map((t: any) => new Date(t.transactionDate).toISOString().slice(0, 7))
      );

      setStats({
        myTotal: myContributions,
        nextDue: contributionAmount, // Real contribution amount from group settings
        paymentStreak: paidMonths.size,
        ranking: 'N/A', // Requires comparing with other members
        contributionFrequency,
        meetingSchedule,
        payoutDate,
        memberCount,
      });

    } catch (error: any) {
      console.error('Member dashboard fetch error:', error);
      // Handle 403 Forbidden - user doesn't have access to this data
      if (error.response?.status === 403) {
        console.log('Access denied - user may not be a member of this group');
        setHasGroup(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMemberData();
  }, [token, groupId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMemberData();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.info} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  // Show empty state if user has no group
  if (!hasGroup) {
    return (
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.info]} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <MaterialIcons name="person" size={24} color={colors.info} />
            <Text style={styles.welcomeText}>
              Welcome, {user?.fullName?.split(' ')[0] || 'Member'}
            </Text>
          </View>
        </View>
        
        <View style={[styles.container, styles.centered, { paddingTop: 60 }]}>
          <MaterialIcons name="group-add" size={80} color={colors.text.disabled} />
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text.primary, marginTop: 20 }}>
            No Group Yet
          </Text>
          <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center', marginTop: 10, paddingHorizontal: 40 }}>
            You haven't joined any stokvel group yet. Join an existing group or create a new one to get started!
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: colors.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 8, marginTop: 30 }}
            onPress={() => onNavigate?.('joinGroup')}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Join a Group</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ marginTop: 15 }}
            onPress={() => onNavigate?.('createGroup')}
          >
            <Text style={{ color: colors.primary, fontSize: 14 }}>Or create a new group</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.info]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <MaterialIcons name="person" size={24} color={colors.info} />
          <Text style={styles.welcomeText}>
            Welcome, {user?.fullName?.split(' ')[0] || 'Member'}
          </Text>
        </View>
        <View style={styles.groupInfo}>
          <MaterialIcons name="groups" size={18} color={colors.text.secondary} />
          <Text style={styles.groupText}>{groupName} Family</Text>
        </View>
      </View>

      {/* My Status Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <MaterialIcons name="account-balance-wallet" size={20} color={colors.primary} /> MY STATUS
        </Text>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <MaterialIcons name="savings" size={20} color={colors.success} />
            <View style={styles.statusText}>
              <Text style={styles.statusLabel}>My Total</Text>
              <Text style={styles.statusValue}>{formatCurrency(stats.myTotal)}</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <MaterialIcons name="schedule" size={20} color={colors.warning} />
            <View style={styles.statusText}>
              <Text style={styles.statusLabel}>Next Due</Text>
              <Text style={styles.statusValue}>{formatCurrency(stats.nextDue)} {stats.nextDueDate ? `in ${stats.nextDueDate}` : ''}</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <MaterialIcons name="local-fire-department" size={20} color={colors.error} />
            <View style={styles.statusText}>
              <Text style={styles.statusLabel}>Payment Streak</Text>
              <Text style={styles.statusValue}>{stats.paymentStreak} months</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <MaterialIcons name="leaderboard" size={20} color={colors.secondary} />
            <View style={styles.statusText}>
              <Text style={styles.statusLabel}>Ranking</Text>
              <Text style={styles.statusValue}>{stats.ranking}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <MaterialIcons name="flash-on" size={20} color={colors.primary} /> QUICK ACTIONS
        </Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => onNavigate?.('makePayment')}>
            <MaterialIcons name="payments" size={32} color={colors.success} />
            <Text style={styles.actionText}>Make{'\n'}Payment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => onNavigate?.('history')}>
            <MaterialIcons name="receipt-long" size={32} color={colors.primary} />
            <Text style={styles.actionText}>My{'\n'}History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => onNavigate?.('meetings')}>
            <MaterialIcons name="event" size={32} color={colors.warning} />
            <Text style={styles.actionText}>View{'\n'}Meetings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Group Info - Real Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <MaterialIcons name="info-outline" size={20} color={colors.primary} /> GROUP INFO
        </Text>
        <View style={styles.updatesCard}>
          <View style={styles.updateItem}>
            <View style={styles.updateIcon}>
              <MaterialIcons name="schedule" size={16} color={colors.warning} />
            </View>
            <View style={styles.updateText}>
              <Text style={styles.updateTitle}>Contribution: {stats.contributionFrequency === 'WEEKLY' ? 'Weekly' : stats.contributionFrequency === 'BIWEEKLY' ? 'Bi-weekly' : 'Monthly'}</Text>
              <Text style={styles.updateTime}>R {stats.nextDue.toFixed(2)} per period</Text>
            </View>
          </View>
          {stats.meetingSchedule && (
            <View style={styles.updateItem}>
              <View style={styles.updateIcon}>
                <MaterialIcons name="event" size={16} color={colors.success} />
              </View>
              <View style={styles.updateText}>
                <Text style={styles.updateTitle}>Meeting Schedule</Text>
                <Text style={styles.updateTime}>{stats.meetingSchedule}</Text>
              </View>
            </View>
          )}
          <View style={styles.updateItem}>
            <View style={styles.updateIcon}>
              <MaterialIcons name="group" size={16} color={colors.info} />
            </View>
            <View style={styles.updateText}>
              <Text style={styles.updateTitle}>Members</Text>
              <Text style={styles.updateTime}>{stats.memberCount || 0} member{(stats.memberCount || 0) !== 1 ? 's' : ''} in this group</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Member Benefits Info */}
      <View style={styles.section}>
        <View style={styles.infoCard}>
          <MaterialIcons name="info" size={20} color={colors.info} />
          <Text style={styles.infoText}>
            You are a valued member of {groupName}. Keep your payments on time to maintain your streak!
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.text.secondary,
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
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  statusText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  statusLabel: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  statusValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  actionCard: {
    width: '31%',
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
  updatesCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  updateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  updateIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  updateText: {
    flex: 1,
  },
  updateTitle: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    fontWeight: '500',
  },
  updateTime: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
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
});
