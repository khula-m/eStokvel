import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

const iconMap: Record<string, string> = {
  dashboard: 'dashboard',
  ledger: 'menu-book',
  chat: 'chat-bubble',
  profile: 'person',
};

export const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <MaterialIcons name={(iconMap[name] || 'circle') as any} size={26} color={focused ? COLORS.primary : '#999'} />
);
