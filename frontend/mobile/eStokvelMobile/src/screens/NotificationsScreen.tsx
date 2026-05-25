import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, RefreshControl,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Icon } from '../components/Icon';
import { API_URL } from '../constants/config';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { scaleFontSize } from '../utils/responsive';
import { shadow } from '../utils/shadow';
import { formatCurrency, formatDateTime } from '../utils/format';
import { AuthState, AppNotification } from '../types';

interface NotificationsScreenProps {
  auth: AuthState;
}

type TypeCfg = { icon: string; color: string; bg: string; label: string; channel: string };

const TYPE_CONFIG: Record<string, TypeCfg> = {
  CONTRIBUTION:  { icon: 'arrow-upward',       color: COLORS.success,   bg: COLORS.accentSoft,    label: 'Contribution',   channel: 'payments'       },
  PAYOUT:        { icon: 'arrow-downward',      color: COLORS.primary,   bg: COLORS.primarySoft,   label: 'Payout',         channel: 'payments'       },
  PENALTY:       { icon: 'gavel',               color: COLORS.error,     bg: COLORS.errorSoft,     label: 'Penalty',        channel: 'payments'       },
  INTEREST:      { icon: 'trending-up',         color: COLORS.secondary, bg: COLORS.secondarySoft, label: 'Interest',       channel: 'payments'       },
  MEETING:       { icon: 'event',               color: '#059669',        bg: '#D1FAE5',            label: 'Meeting',        channel: 'meetings'       },
  ANNOUNCEMENT:  { icon: 'campaign',            color: '#7C3AED',        bg: '#EDE9FE',            label: 'Announcement',   channel: 'announcements'  },
  MEMBER_ADDED:  { icon: 'person-add',          color: COLORS.primary,   bg: COLORS.primarySoft,   label: 'New Member',     channel: 'default'        },
  CHAT:          { icon: 'chat-bubble',         color: COLORS.textLight, bg: '#F3F4F6',            label: 'Chat',           channel: 'chat'           },
  DEFAULT:       { icon: 'notifications',       color: COLORS.textLight, bg: '#F3F4F6',            label: 'Notification',   channel: 'default'        },
};

function getCfg(type: string): TypeCfg {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.DEFAULT;
}

function extractAmount(message: string): number | null {
  const m = message.match(/R([\d,.]+)/);
  return m ? parseFloat(m[1].replace(',', '')) : null;
}

function extractGroup(message: string): string {
  const m = message.match(/ - (.+)$/);
  return m ? m[1] : '';
}

export const NotificationsScreen = ({ auth }: NotificationsScreenProps) => {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const headers = { Authorization: `Bearer ${auth.token}` };

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/notifications`, { headers });
      setNotifications(res.data.data || []);
    } catch {
      // Non-fatal — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth.token]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

  const unread = notifications.filter(n => !(n as any).isRead).length;

  if (loading) {
    return (
      <View style={ns.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={ns.root} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#0A2463', '#0F3285', '#1A43A8']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={ns.header}>
        <View style={ns.headerRow}>
          <View style={ns.headerIconCircle}>
            <Icon name="notifications" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ns.headerTitle}>Notifications</Text>
            <Text style={ns.headerSubtitle}>
              {unread > 0 ? `${unread} unread` : notifications.length === 0 ? 'All clear' : `${notifications.length} total`}
            </Text>
          </View>
          {unread > 0 && (
            <View style={ns.badge}>
              <Text style={ns.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={ns.scroll}
        contentContainerStyle={ns.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}>

        {notifications.length === 0 ? (
          <View style={ns.emptyWrap}>
            <View style={ns.emptyIconCircle}>
              <Icon name="notifications" size={44} color={COLORS.textMuted} />
            </View>
            <Text style={ns.emptyTitle}>No notifications yet</Text>
            <Text style={ns.emptyText}>
              Money movements, meetings, and announcements will appear here.
            </Text>
          </View>
        ) : (
          notifications.map(item => {
            const cfg    = getCfg(item.type);
            const amount = extractAmount(item.message);
            const group  = extractGroup(item.message);
            const isRead = (item as any).isRead !== false;

            return (
              <View key={item.id} style={[ns.card, !isRead && ns.cardUnread]}>
                {/* Unread indicator */}
                {!isRead && <View style={ns.unreadDot} />}

                <View style={[ns.iconCircle, { backgroundColor: cfg.bg }]}>
                  <Icon name={cfg.icon as any} size={20} color={cfg.color} />
                </View>

                <View style={ns.content}>
                  <View style={ns.topRow}>
                    <Text style={ns.typeLabel} numberOfLines={1}>{cfg.label}</Text>
                    <View style={[ns.statusBadge, {
                      backgroundColor:
                        item.status === 'COMPLETED' ? '#ECFDF5' :
                        item.status === 'PENDING'   ? '#FFFBEB' : '#F3F4F6',
                    }]}>
                      <Text style={[ns.statusText, {
                        color:
                          item.status === 'COMPLETED' ? COLORS.success :
                          item.status === 'PENDING'   ? COLORS.warning  : COLORS.textLight,
                      }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  {group ? (
                    <Text style={ns.groupName} numberOfLines={1}>{group}</Text>
                  ) : null}

                  {amount !== null ? (() => {
                    // Sign + colour reflect the MEMBER's money flow.
                    //   CONTRIBUTION → money out of my pocket → red minus
                    //   PAYOUT       → money into my pocket  → green plus
                    //   REVERSED     → flips the sign; money came back / went back
                    const baseOutflow = item.type === 'CONTRIBUTION';
                    const outflow = item.status === 'REVERSED' ? !baseOutflow : baseOutflow;
                    const sign = outflow ? '-' : '+';
                    const amountColor = outflow ? COLORS.error : COLORS.success;
                    return (
                      <Text style={[ns.amount, { color: amountColor }]}>
                        {sign}{formatCurrency(amount)}
                      </Text>
                    );
                  })() : (
                    <Text style={ns.messageText} numberOfLines={2}>{item.message}</Text>
                  )}

                  <Text style={ns.date}>{formatDateTime(item.date)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const ns = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F8FAFC' },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },

  header: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  headerRow:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  headerIconCircle: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle:    { fontSize: scaleFontSize(20), fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: scaleFontSize(12), color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  badge: {
    minWidth: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.error,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  scroll:        { flex: 1 },
  scrollContent: { paddingTop: SPACING.md, paddingBottom: SPACING.xxl, paddingHorizontal: SPACING.md },

  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff',
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...shadow(2, 8, 0.06),
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  unreadDot: {
    position: 'absolute', top: 12, right: 12,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  iconCircle: {
    width: 44, height: 44, borderRadius: RADIUS.circle,
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.md, flexShrink: 0,
  },
  content:  { flex: 1, minWidth: 0 },
  topRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  typeLabel: { fontSize: scaleFontSize(13), fontWeight: '700', color: COLORS.text, flexShrink: 1 },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm, marginLeft: 6, flexShrink: 0 },
  statusText:  { fontSize: scaleFontSize(10), fontWeight: '700', textTransform: 'uppercase' },

  groupName:   { fontSize: scaleFontSize(12), color: COLORS.textMuted, marginBottom: 2 },
  amount:      { fontSize: scaleFontSize(16), fontWeight: '700', marginVertical: 2 },
  messageText: { fontSize: scaleFontSize(13), color: COLORS.textSecondary, lineHeight: 18, marginVertical: 2 },
  date:        { fontSize: scaleFontSize(11), color: COLORS.textMuted, marginTop: 4 },

  emptyWrap:       { alignItems: 'center', paddingTop: SPACING.xxl * 1.5, paddingHorizontal: SPACING.xl },
  emptyIconCircle: {
    width: 88, height: 88, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: { fontSize: scaleFontSize(18), fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  emptyText:  { fontSize: scaleFontSize(14), color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
});
