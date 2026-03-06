import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, RefreshControl,
  TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import axios from 'axios';
import { Icon } from '../components/Icon';
import { showAlert } from '../utils/alert';
import { API_URL } from '../constants/config';
import { COLORS } from '../constants/theme';
import { styles } from '../styles';
import { scaleFontSize } from '../utils/responsive';
import { formatCurrency, formatDateTime } from '../utils/format';
import { AuthState, AppNotification } from '../types';

interface NotificationsScreenProps {
  auth: AuthState;
}

const typeConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  CONTRIBUTION: { icon: 'arrow-upward', color: COLORS.success, bg: '#ECFDF5', label: 'Contribution' },
  PAYOUT: { icon: 'arrow-downward', color: COLORS.primary, bg: '#EFF6FF', label: 'Payout' },
  PENALTY: { icon: 'warning', color: COLORS.error, bg: '#FEF2F2', label: 'Penalty' },
  INTEREST: { icon: 'trending-up', color: COLORS.secondary, bg: '#FFFBEB', label: 'Interest' },
  DEFAULT: { icon: 'notifications', color: COLORS.textLight, bg: '#F3F4F6', label: 'Notification' },
};

const shadow = (offsetY: number, blur: number, opacity: number): any =>
  Platform.OS === 'web'
    ? { boxShadow: `0 ${offsetY}px ${blur}px rgba(0,0,0,${opacity})` }
    : { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: blur / 2, elevation: Math.round(blur / 2) };

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
      <View style={styles.centered}>
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
      <View key={item.id} style={[localStyles.card, shadow(2, 8, 0.06)]}>
        <View style={[localStyles.iconCircle, { backgroundColor: cfg.bg }]}>
          <Icon name={cfg.icon} size={22} color={cfg.color} />
        </View>
        <View style={localStyles.content}>
          <View style={localStyles.topRow}>
            <Text style={localStyles.typeLabel}>{cfg.label}</Text>
            <View style={[localStyles.statusBadge, {
              backgroundColor: item.status === 'COMPLETED' ? '#ECFDF5' : item.status === 'PENDING' ? '#FFFBEB' : '#FEF2F2'
            }]}>
              <Text style={[localStyles.statusText, {
                color: item.status === 'COMPLETED' ? COLORS.success : item.status === 'PENDING' ? COLORS.warning : COLORS.error
              }]}>{item.status}</Text>
            </View>
          </View>
          {groupName ? <Text style={localStyles.groupName}>{groupName}</Text> : null}
          {amount !== null && (
            <Text style={[localStyles.amount, { color: cfg.color }]}>
              {item.type === 'CONTRIBUTION' ? '-' : '+'}{formatCurrency(amount)}
            </Text>
          )}
          <Text style={localStyles.date}>{formatDateTime(item.date)}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.screenContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      <View style={localStyles.header}>
        <Text style={localStyles.title}>Notifications</Text>
        <Text style={localStyles.subtitle}>
          {notifications.length} recent {notifications.length === 1 ? 'update' : 'updates'}
        </Text>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <Icon name="notifications-none" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>
            Your transaction updates and reminders will appear here.
          </Text>
        </View>
      ) : (
        <View style={{ paddingBottom: 24 }}>
          {notifications.map(renderNotification)}
        </View>
      )}
    </ScrollView>
  );
};

const localStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: scaleFontSize(22),
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: scaleFontSize(13),
    color: COLORS.textLight,
    marginTop: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: scaleFontSize(10),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  groupName: {
    fontSize: scaleFontSize(12),
    color: COLORS.textLight,
    marginBottom: 2,
  },
  amount: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    marginVertical: 2,
  },
  date: {
    fontSize: scaleFontSize(11),
    color: COLORS.textLight,
    marginTop: 2,
  },
});
