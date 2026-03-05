import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export type IconName =
  | 'dashboard' | 'groups' | 'group' | 'person' | 'person-outline' | 'payments' | 'receipt-long' | 'assessment'
  | 'person-add' | 'event' | 'account-balance-wallet' | 'schedule' | 'leaderboard' | 'whatshot'
  | 'campaign' | 'history' | 'notifications' | 'settings' | 'home' | 'trending-up' | 'trending-down' | 'flash-on'
  | 'download' | 'filter-list' | 'search' | 'chevron-right' | 'add' | 'check-circle' | 'cancel'
  | 'pending' | 'warning' | 'info' | 'logout' | 'phone' | 'email' | 'lock' | 'lock-outline' | 'visibility'
  | 'visibility-off' | 'arrow-back' | 'close' | 'edit' | 'delete' | 'send' | 'group-add' | 'badge' | 'work'
  | 'location-on' | 'credit-card' | 'attach-money' | 'fingerprint' | 'help-outline' | 'star' | 'language'
  | 'expand-more' | 'expand-less' | 'admin-panel-settings' | 'people' | 'refresh' | 'supervisor-account' | 'analytics'
  | 'menu-book' | 'chat-bubble' | 'chat' | 'bar-chart' | 'announcement' | 'event-note' | 'how-to-reg'
  | 'arrow-forward' | 'account-balance' | 'description' | 'check' | 'more-vert' | 'today' | 'access-time'
  | 'thumb-up' | 'thumb-down' | 'reply' | 'shield' | 'security';

export const Icon = ({ name, size = 24, color = COLORS.text }: { name: IconName; size?: number; color?: string }) => (
  <MaterialIcons name={name as any} size={size} color={color} />
);
