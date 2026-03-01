import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import axios from 'axios';
import { Icon } from '../components/Icon';
import { API_URL } from '../constants/config';
import { COLORS } from '../constants/theme';
import { styles } from '../styles';
import { AuthState } from '../types';

export const ProfileScreen = ({ auth, onLogout, onNavigate }: { auth: AuthState; onLogout: () => void; onNavigate?: (screen: string) => void }) => {
  const [membershipCount, setMembershipCount] = useState(0);
  const [totalContributed, setTotalContributed] = useState(0);
  const userRole = auth.user?.role || 'MEMBER';
  const isSuperAdmin = userRole === 'SUPERADMIN';

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const headers = { Authorization: `Bearer ${auth.token}` };
        if (isSuperAdmin) {
          // SUPERADMIN doesn't have personal groups/contributions
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
      } catch (error) { console.error('Profile data fetch error:', error); }
    };
    fetchProfileData();
  }, [auth.token, isSuperAdmin]);

  const formatPhone = (phone: string) => {
    if (phone?.startsWith('27')) return `0${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
    return phone;
  };
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const getRoleColor = (role: string) => ({ SUPERADMIN: '#9C27B0', ADMIN: COLORS.primary, MEMBER: '#607D8B' }[role] || '#607D8B');
  const getRoleLabel = (role: string) => ({ SUPERADMIN: 'System Administrator', ADMIN: 'Group Administrator', MEMBER: 'Member' }[role] || role);
  const formatCurrency = (amount: number | string) => `R ${Number(amount || 0).toFixed(2)}`;

  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeaderCard}>
        <View style={[styles.profileAvatar, { backgroundColor: getRoleColor(auth.user?.role || 'MEMBER') }]}>
          <Text style={styles.profileAvatarText}>{getInitials(auth.user?.fullName || '')}</Text>
        </View>
        <Text style={styles.profileFullName}>{auth.user?.fullName}</Text>
        <View style={[styles.profileRoleBadge, { backgroundColor: getRoleColor(auth.user?.role || 'MEMBER') }]}>
          <Text style={styles.profileRoleBadgeText}>{getRoleLabel(auth.user?.role || 'MEMBER')}</Text>
        </View>
        {!isSuperAdmin && (
          <View style={styles.profileStatsRow}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{membershipCount}</Text>
              <Text style={styles.profileStatLabel}>Stokvel Groups</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{formatCurrency(totalContributed)}</Text>
              <Text style={styles.profileStatLabel}>Total Contributed</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.profileSection}>
        <View style={styles.profileSectionHeaderRow}>
          <Icon name="phone" size={18} color={COLORS.primary} />
          <Text style={styles.profileSectionHeader}>Contact Information</Text>
        </View>
        <View style={styles.profileInfoRow}>
          <View style={[styles.profileInfoIcon, { backgroundColor: '#EFF6FF' }]}><Icon name="phone" size={18} color={COLORS.primary} /></View>
          <View style={styles.profileInfoContent}>
            <Text style={styles.profileInfoLabel}>Mobile Phone Number</Text>
            <Text style={styles.profileInfoValue}>{formatPhone(auth.user?.phoneNumber || '')}</Text>
          </View>
        </View>
        <View style={styles.profileInfoRow}>
          <View style={[styles.profileInfoIcon, { backgroundColor: '#E3F2FD' }]}><Icon name="email" size={18} color={COLORS.member} /></View>
          <View style={styles.profileInfoContent}>
            <Text style={styles.profileInfoLabel}>Email Address</Text>
            <Text style={styles.profileInfoValue}>{auth.user?.email || 'No email address provided'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.profileSectionHeaderRow}>
          <Icon name="lock" size={18} color={COLORS.primary} />
          <Text style={styles.profileSectionHeader}>Account Information</Text>
        </View>
        <View style={styles.profileInfoRow}>
          <View style={[styles.profileInfoIcon, { backgroundColor: '#F3E5F5' }]}><Icon name="person" size={18} color="#7B1FA2" /></View>
          <View style={styles.profileInfoContent}>
            <Text style={styles.profileInfoLabel}>Full Name</Text>
            <Text style={styles.profileInfoValue}>{auth.user?.fullName || 'Not set'}</Text>
          </View>
        </View>
        <View style={styles.profileInfoRow}>
          <View style={[styles.profileInfoIcon, { backgroundColor: '#FFF3E0' }]}><Icon name="person" size={18} color={COLORS.accent} /></View>
          <View style={styles.profileInfoContent}>
            <Text style={styles.profileInfoLabel}>Account Type</Text>
            <Text style={styles.profileInfoValue}>{getRoleLabel(auth.user?.role || 'MEMBER')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.profileSectionHeaderRow}>
          <Icon name="settings" size={18} color={COLORS.primary} />
          <Text style={styles.profileSectionHeader}>Settings & Preferences</Text>
        </View>
        {!isSuperAdmin && (
          <TouchableOpacity style={styles.profileActionRow} onPress={() => onNavigate?.('change-pin')}>
            <View style={styles.profileActionLeft}>
              <View style={[styles.profileActionIconBg, { backgroundColor: '#EFF6FF' }]}>
                <Icon name="lock" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.profileActionText}>Change Your PIN</Text>
            </View>
            <Icon name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButtonLarge} onPress={onLogout}>
        <Icon name="logout" size={20} color={COLORS.error} />
        <Text style={styles.logoutButtonLargeText}>Sign Out of Your Account</Text>
      </TouchableOpacity>
      <Text style={styles.versionText}>eStokvel v2.0.0 · Proudly South African</Text>
    </ScrollView>
  );
};
