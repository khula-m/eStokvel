import React from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { TabIcon } from './TabIcon';
import { COLORS } from '../constants/theme';

interface BottomTabBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  userRole: string;
}

const allTabs = [
  { key: 'dashboard', label: 'Home' },
  { key: 'ledger', label: 'Ledger' },
  { key: 'chat', label: 'Chat' },
  { key: 'profile', label: 'Profile' },
];

export const BottomTabBar = ({ currentTab, onTabChange, userRole }: BottomTabBarProps) => {
  const tabs = userRole === 'SUPERADMIN'
    ? allTabs.filter(t => ['dashboard', 'profile'].includes(t.key))
    : allTabs;

  return (
    <View style={tabBarStyles.container}>
      {tabs.map((tab) => {
        const active = currentTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={tabBarStyles.item}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <View style={[tabBarStyles.iconWrapper, active && tabBarStyles.iconWrapperActive]}>
              <TabIcon name={tab.key} focused={active} />
            </View>
            <Text style={[tabBarStyles.label, active && tabBarStyles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const tabBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'web' ? 12 : 24,
    borderTopWidth: 0,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 8 }),
  } as any,
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrapper: {
    width: 44,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconWrapperActive: {
    backgroundColor: `${COLORS.primary}14`,
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
