import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { Icon } from '../components/Icon';
import { showAlert } from '../utils/alert';
import { API_URL } from '../constants/config';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { scaleFontSize } from '../utils/responsive';
import { shadow } from '../utils/shadow';
import { formatCurrency } from '../utils/format';
import { AuthState } from '../types';

export const ProfileScreen = ({ auth, onLogout, onNavigate }: { auth: AuthState; onLogout: () => void; onNavigate?: (screen: string) => void }) => {
  const [membershipCount, setMembershipCount] = useState(0);
  const [totalContributed, setTotalContributed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const userRole = auth.user?.role || 'MEMBER';
  const isSuperAdmin = userRole === 'SUPERADMIN';

  const fetchProfileData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      if (isSuperAdmin) {
        setMembershipCount(0);
        setTotalContributed(0);
        return;
      }
      const [groupsRes, transactionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/groups`, { headers }),
        axios.get(`${API_URL}/api/transactions/my`, { headers })
      ]);
      setMembershipCount((groupsRes.data.data || []).length);
      const transactions = transactionsRes.data?.data?.transactions || [];
      const contributions = transactions
        .filter((t: any) => t.transactionType === 'CONTRIBUTION' && t.status === 'COMPLETED')
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
      setTotalContributed(contributions);
    } catch (error) {
      console.error('Profile data fetch error:', error);
      showAlert('Error', 'Failed to load profile data. Pull down to retry.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [auth.token, isSuperAdmin]);

  useEffect(() => { fetchProfileData(); }, [fetchProfileData]);

  const formatPhone = (phone: string) => {
    if (phone?.startsWith('27')) return `0${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
    return phone;
  };
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const getRoleLabel = (role: string) => ({ SUPERADMIN: 'System Administrator', ADMIN: 'Group Administrator', MEMBER: 'Member' }[role] || role);
  const displayRole = auth.user?.role === 'SUPERADMIN' ? 'SUPERADMIN' : (auth.user?.effectiveRole || auth.user?.role || 'MEMBER');

  if (loading) {
    return <View style={ps.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView style={ps.container} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfileData(); }} colors={[COLORS.primary]} />}>

      {/* Gradient Profile Header */}
      <LinearGradient colors={['#0A2463', '#0F3285', '#1A43A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={ps.header}>
        <View style={ps.avatarRing}>
          <View style={ps.avatar}>
            <Text style={ps.avatarText}>{getInitials(auth.user?.fullName || '')}</Text>
          </View>
        </View>
        <Text style={ps.fullName}>{auth.user?.fullName}</Text>
        <View style={ps.roleBadge}>
          <Text style={ps.roleBadgeText}>{getRoleLabel(displayRole)}</Text>
        </View>

        {/* Verification Status Badge */}
        {!isSuperAdmin && (() => {
          const vs = auth.user?.verificationStatus;
          if (vs === 'VERIFIED') return (
            <View style={[ps.verificationBadge, { backgroundColor: 'rgba(34,197,94,0.2)' }]}>
              <Icon name="verified-user" size={14} color="#22C55E" />
              <Text style={[ps.verificationBadgeText, { color: '#22C55E' }]}>Identity Verified</Text>
            </View>
          );
          if (vs === 'PENDING_VERIFY') return (
            <View style={[ps.verificationBadge, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
              <Icon name="schedule" size={14} color="#3B82F6" />
              <Text style={[ps.verificationBadgeText, { color: '#3B82F6' }]}>Verification Pending</Text>
            </View>
          );
          if (vs === 'FAILED') return (
            <View style={[ps.verificationBadge, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
              <Icon name="warning" size={14} color="#EF4444" />
              <Text style={[ps.verificationBadgeText, { color: '#EF4444' }]}>Verification Failed</Text>
            </View>
          );
          return null;
        })()}

        {!isSuperAdmin && (
          <View style={ps.statsRow}>
            <View style={ps.statItem}>
              <Text style={ps.statValue}>{membershipCount}</Text>
              <Text style={ps.statLabel}>Groups</Text>
            </View>
            <View style={ps.statDivider} />
            <View style={ps.statItem}>
              <Text style={ps.statValue}>{formatCurrency(totalContributed)}</Text>
              <Text style={ps.statLabel}>Contributed</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Verify Identity Prompt */}
      {!isSuperAdmin && (!auth.user?.verificationStatus || auth.user.verificationStatus === 'UNVERIFIED') && (
        <TouchableOpacity
          style={ps.verifyPrompt}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNavigate?.('id-verification'); }}
          accessibilityLabel="Verify your identity" accessibilityRole="button"
        >
          <View style={ps.verifyPromptIcon}>
            <Icon name="verified-user" size={22} color="#0A2463" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ps.verifyPromptTitle}>Verify Your Identity</Text>
            <Text style={ps.verifyPromptDesc}>Complete ID verification to unlock payouts</Text>
          </View>
          <Icon name="chevron-right" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      )}

      {/* Contact Information */}
      <View style={ps.section}>
        <View style={ps.sectionHeaderRow}>
          <Icon name="phone" size={18} color={COLORS.primary} />
          <Text style={ps.sectionHeader}>Contact Information</Text>
        </View>
        <View style={ps.infoRow}>
          <View style={[ps.infoIcon, { backgroundColor: COLORS.primarySoft }]}><Icon name="phone" size={18} color={COLORS.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={ps.infoLabel}>Mobile Phone Number</Text>
            <Text style={ps.infoValue}>{formatPhone(auth.user?.phoneNumber || '')}</Text>
          </View>
        </View>
        <View style={[ps.infoRow, { borderBottomWidth: 0 }]}>
          <View style={[ps.infoIcon, { backgroundColor: COLORS.primarySoft }]}><Icon name="email" size={18} color={COLORS.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={ps.infoLabel}>Email Address</Text>
            <Text style={ps.infoValue}>{auth.user?.email || 'No email address provided'}</Text>
          </View>
        </View>
      </View>

      {/* Account Information */}
      <View style={ps.section}>
        <View style={ps.sectionHeaderRow}>
          <Icon name="lock" size={18} color={COLORS.primary} />
          <Text style={ps.sectionHeader}>Account Information</Text>
        </View>
        <View style={ps.infoRow}>
          <View style={[ps.infoIcon, { backgroundColor: COLORS.primarySoft }]}><Icon name="person" size={18} color={COLORS.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={ps.infoLabel}>Full Name</Text>
            <Text style={ps.infoValue}>{auth.user?.fullName || 'Not set'}</Text>
          </View>
        </View>
        <View style={[ps.infoRow, { borderBottomWidth: 0 }]}>
          <View style={[ps.infoIcon, { backgroundColor: COLORS.warningSoft }]}><Icon name="person" size={18} color={COLORS.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={ps.infoLabel}>Account Type</Text>
            <Text style={ps.infoValue}>{getRoleLabel(displayRole)}</Text>
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={ps.section}>
        <View style={ps.sectionHeaderRow}>
          <Icon name="settings" size={18} color={COLORS.primary} />
          <Text style={ps.sectionHeader}>Settings & Preferences</Text>
        </View>
        {!isSuperAdmin && (
          <TouchableOpacity style={ps.actionRow}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNavigate?.('change-pin'); }}
            accessibilityLabel="Change your PIN" accessibilityRole="button">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[ps.infoIcon, { backgroundColor: COLORS.primarySoft }]}>
                <Icon name="lock" size={18} color={COLORS.primary} />
              </View>
              <Text style={ps.actionText}>Change Your PIN</Text>
            </View>
            <Icon name="chevron-right" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity style={ps.logoutBtn}
        onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); onLogout(); }}
        accessibilityLabel="Sign out" accessibilityRole="button">
        <Icon name="logout" size={20} color={COLORS.error} />
        <Text style={ps.logoutText}>Sign Out of Your Account</Text>
      </TouchableOpacity>
      <Text style={ps.version}>eStokvel v2.0.0 · Proudly South African</Text>
    </ScrollView>
  );
};

const ps = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },

  header: {
    alignItems: 'center', paddingTop: SPACING.lg, paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderBottomLeftRadius: RADIUS.xxl, borderBottomRightRadius: RADIUS.xxl,
  },
  avatarRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md,
  },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 34, fontWeight: '800', color: '#fff' },
  fullName: { fontSize: scaleFontSize(22), fontWeight: '800', color: '#fff', marginBottom: SPACING.sm },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: SPACING.lg,
    paddingVertical: 7, borderRadius: RADIUS.pill, marginBottom: SPACING.lg,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  verificationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: 5,
    borderRadius: RADIUS.pill, marginBottom: SPACING.md,
  },
  verificationBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: scaleFontSize(18), fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4, fontWeight: '500' },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)' },

  verifyPrompt: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: SPACING.md, marginTop: SPACING.md,
    borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: '#0A2463',
    ...shadow(2, 8, 0.06),
  } as any,
  verifyPromptIcon: {
    width: 42, height: 42, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  verifyPromptTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  verifyPromptDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  section: {
    backgroundColor: '#fff', marginHorizontal: SPACING.md, marginTop: SPACING.md,
    borderRadius: RADIUS.xl, padding: SPACING.lg,
    ...shadow(2, 8, 0.04),
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  sectionHeader: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  infoIcon: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  infoLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  infoValue: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginTop: 2 },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  actionText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },

  logoutBtn: {
    flexDirection: 'row', backgroundColor: COLORS.errorSoft, marginHorizontal: SPACING.md,
    marginTop: SPACING.md, padding: SPACING.lg, borderRadius: RADIUS.lg,
    alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.error,
  },
  logoutText: { color: COLORS.error, fontSize: scaleFontSize(16), fontWeight: '700' },
  version: { textAlign: 'center', color: COLORS.textMuted, marginVertical: SPACING.lg, fontSize: 12 },
});
