import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, fontSize } from '../../theme/spacing';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

const ProfileScreen: React.FC = () => {
  const { user, token, logout } = useAuthStore();
  const [stats, setStats] = useState({ groups: 0, totalSaved: 0, transactions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!token) return;
      
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch user's groups and transactions
        const [groupsRes, transRes] = await Promise.all([
          axios.get(`${API_URL}/api/groups`, { headers }).catch(() => ({ data: { data: [] } })),
          axios.get(`${API_URL}/api/transactions/my`, { headers }).catch(() => ({ data: { data: { transactions: [] } } }))
        ]);

        const groups = groupsRes.data.data || [];
        const transData = transRes.data.data;
        const transactions = Array.isArray(transData) ? transData : (transData?.transactions || []);
        
        const totalSaved = transactions
          .filter((t: any) => t.transactionType === 'CONTRIBUTION' && t.status === 'COMPLETED')
          .reduce((sum: number, t: any) => sum + t.amount, 0);

        setStats({
          groups: groups.length,
          totalSaved,
          transactions: transactions.length,
        });
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [token]);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const menuItems = [
    { icon: '👤', title: 'Edit Profile', subtitle: 'Update your personal information' },
    { icon: '🔔', title: 'Notifications', subtitle: 'Manage notification preferences' },
    { icon: '🔒', title: 'Security', subtitle: 'Change password & security settings' },
    { icon: '🌍', title: 'Language', subtitle: user?.language?.toUpperCase() || 'EN' },
    { icon: '📞', title: 'Support', subtitle: 'Get help & contact us' },
    { icon: '📄', title: 'Terms & Conditions', subtitle: 'Legal information' },
    { icon: 'ℹ️', title: 'About', subtitle: 'App version 1.0.0' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.fullName || 'User'}</Text>
        <Text style={styles.phone}>{user?.phoneNumber || ''}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role || 'MEMBER'}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{loading ? '-' : stats.groups}</Text>
          <Text style={styles.statLabel}>Groups</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{loading ? '-' : `R ${stats.totalSaved.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}</Text>
          <Text style={styles.statLabel}>Total Saved</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{loading ? '-' : stats.transactions}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>{item.icon}</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>eStokvel v1.0.0</Text>
        <Text style={styles.footerText}>© 2026 eStokvel. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  name: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  phone: {
    fontSize: fontSize.md,
    color: colors.white,
    opacity: 0.9,
    marginBottom: spacing.sm,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  roleText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    margin: spacing.lg,
    marginTop: -spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.divider,
  },
  menuSection: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuIconText: {
    fontSize: 18,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'normal',
    color: colors.text.primary,
  },
  menuSubtitle: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 24,
    color: colors.text.disabled,
  },
  logoutButton: {
    margin: spacing.lg,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.text.disabled,
    marginBottom: spacing.xs,
  },
});

export default ProfileScreen;
