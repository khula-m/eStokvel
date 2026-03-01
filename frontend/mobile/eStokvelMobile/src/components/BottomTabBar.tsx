import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TabIcon } from './TabIcon';
import { styles } from '../styles';

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
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity key={tab.key} style={styles.tabItem} onPress={() => onTabChange(tab.key)}>
          <TabIcon name={tab.key} focused={currentTab === tab.key} />
          <Text style={[styles.tabLabel, currentTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
