import React from 'react';
import { View, Text } from 'react-native';
import { Icon, IconName } from './Icon';
import { styles } from '../styles';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon?: IconName;
}

export const StatsCard = ({ title, value, subtitle, color = '#0A2463', icon }: StatsCardProps) => (
  <View style={[styles.statsCard, { borderLeftColor: color }]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon && <Icon name={icon} size={18} color={color} />}
      <Text style={styles.statsTitle}>{title}</Text>
    </View>
    <Text style={[styles.statsValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
  </View>
);
