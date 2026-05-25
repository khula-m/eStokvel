import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet, Animated } from 'react-native';
import { TabIcon } from './TabIcon';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import * as Haptics from 'expo-haptics';

interface BottomTabBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  userRole: string;
}

// Chat lives INSIDE a group (per-group context), so it isn't a bottom tab —
// users reach it from the Chat tile on each group's home screen. Having it
// in the bottom bar created a "pick a group first" detour that didn't fit
// the per-group model.
const allTabs = [
  { key: 'dashboard', label: 'Home' },
  { key: 'ledger', label: 'Activity' },
  { key: 'notifications', label: 'Alerts' },
  { key: 'profile', label: 'Profile' },
];

const shadow = (offsetY: number, blur: number, opacity: number): any =>
  Platform.OS === 'web'
    ? { boxShadow: `0 ${offsetY}px ${blur}px rgba(0,0,0,${opacity})` }
    : { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: blur / 2, elevation: Math.round(blur / 2) };

export const BottomTabBar = ({ currentTab, onTabChange, userRole }: BottomTabBarProps) => {
  const tabs = userRole === 'SUPERADMIN'
    ? allTabs.filter(t => ['dashboard', 'profile'].includes(t.key))
    : allTabs;

  const handlePress = (key: string) => {
    if (key !== currentTab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onTabChange(key);
  };

  return (
    <View style={s.container}>
      {tabs.map((tab) => {
        const active = currentTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={s.item}
            onPress={() => handlePress(tab.key)}
            activeOpacity={0.7}
            accessibilityLabel={`${tab.label} tab`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <View style={[s.iconWrapper, active && s.iconWrapperActive]}>
              <TabIcon name={tab.key} focused={active} />
              {active && <View style={s.activeDot} />}
            </View>
            <Text style={[s.label, active && s.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'web' ? 12 : 28,
    borderTopWidth: 0,
    ...shadow(-4, 20, 0.06),
  } as any,
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrapper: {
    width: 48,
    height: 34,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconWrapperActive: {
    backgroundColor: COLORS.primarySoft,
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 2,
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
