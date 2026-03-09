import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, RefreshControl,
  TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Icon } from '../components/Icon';
import { showAlert } from '../utils/alert';
import { API_URL } from '../constants/config';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { scaleFontSize } from '../utils/responsive';
import { shadow } from '../utils/shadow';
import { formatCurrency, formatDateTime } from '../utils/format';
import { AuthState, AppNotification } from '../types';

interface NotificationsScreenProps {
  auth: AuthState;
}

const typeConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  CONTRIBUTION: { icon: 'arrow-upward', color: COLORS.success, bg: COLORS.accentSoft, label: 'Contribution' },
  PAYOUT: { icon: 'arrow-downward', color: COLORS.primary, bg: COLORS.primarySoft, label: 'Payout' },
  PENALTY: { icon: 'warning', color: COLORS.error, bg: COLORS.errorSoft, label: 'Penalty' },
  INTEREST: { icon: 'trending-up', color: COLORS.secondary, bg: COLORS.secondarySoft, label: 'Interest' },
  DEFAULT: { icon: 'notifications', color: COLORS.textLight, bg: '#F3F4F6', label: 'Notification' },
};

export const NotificationsScreen = ({ auth }: NotificationsScreenProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const headers = { Authorization: `Bearer ${auth.token}` };

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/notifications`, { headers });
      setNotifications(res.data.data || []);
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth.token]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

  if (loading) {
    return (
      <View style={ns.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const renderNotification = (item: AppNotification) => {
    const cfg = typeConfig[item.type] || typeConfig.DEFAULT;
    const amountMatch = item.message.match(/R([\d.,]+)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
    const groupMatch = item.message.match(/ - (.+)$/);
    const groupName = groupMatch ? groupMatch[1] : '';

    return (
      <View key={item.id} style={ns.card}>
        <View style={[ns.iconCircle, { backgroundColor: cfg.bg }]}>
          <Icon name={cfg.icon} size={22} color={cfg.color} />
        </View>
        <View style={ns.content}>
          <View style={ns.topRow}>
            <Text style={ns.typeLabel}>{cfg.label}</Text>
            <View style={[ns.statusBadge, {
              backgroundColor: item.status === 'COMPLETED' ? '#ECFDF5' : item.status === 'PENDING' ? '#FFFBEB' : '#FEF2F2'
            }]}>
              <Text style={[ns.statusText, {
                color: item.status === 'COMPLETED' ? COLORS.success : item.status === 'PENDING' ? COLORS.warning : COLORS.error
              }]}>{item.status}</Text>
            </View>
          </View>
          {groupName ? <Text style={ns.groupName}>{groupName}</Text> : null}
          {amount !== null && (
            <Text style={[ns.amount, { color: cfg.color }]}>
              {item.type === 'CONTRIBUTION' ? '-' : '+'}{formatCurrency(amount)}
            </Text>
          )}
          <Text style={ns.date}>{formatDateTime(item.date)}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={ns.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>

      {/* Gradient Header */}
      <LinearGradient colors={['#0A2463', '#0F3285', '#1A43A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={ns.header}>
        <View style={ns.headerRow}>
          <View style={ns.headerIconCircle}>
            <Icon name="notifications" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ns.headerTitle}>Notifications</Text>
            <Text style={ns.headerSubtitle}>
              {notifications.length} recent {notifications.length === 1 ? 'update' : 'updates'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {notifications.length === 0 ? (
        <View style={ns.emptyWrap}>
          <View style={ns.emptyIcon}>
            <Icon name="notifications" size={48} color={COLORS.textMuted} />
          </View>
          <Text style={ns.emptyTitle}>No notifications yet</Text>
          <Text style={ns.emptyText}>
            Your transaction updates and reminders will appear here.
          </Text>
        </View>
      ) : (
        <View style={{ paddingTop: SPACING.md, paddingBottom: SPACING.lg }}>
          {notifications.map(renderNotification)}
        </View>
      )}
    </ScrollView>
  );
};

const ns = StyleSheet.create({
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

  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff', marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
    borderRadius: RADIUS.lg, padding: SPACING.md,
    ...shadow(2, 8, 0.06),
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: RADIUS.circle,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  content: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  typeLabel: { fontSize: scaleFontSize(14), fontWeight: '600', color: COLORS.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm },
  statusText: { fontSize: scaleFontSize(10), fontWeight: '700', textTransform: 'uppercase' },
  groupName: { fontSize: scaleFontSize(12), color: COLORS.textMuted, marginBottom: 2 },
  amount: { fontSize: scaleFontSize(16), fontWeight: '700', marginVertical: 2 },
  date: { fontSize: scaleFontSize(11), color: COLORS.textMuted, marginTop: 2 },

  emptyWrap: { alignItems: 'center', padding: SPACING.xxl, marginTop: SPACING.xl },
  emptyIcon: {
    width: 88, height: 88, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.borderLight, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg,
  },
  emptyTitle: { fontSize: scaleFontSize(18), fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  emptyText: { fontSize: scaleFontSize(14), color: COLORS.textMuted, textAlign: 'center' },
});
