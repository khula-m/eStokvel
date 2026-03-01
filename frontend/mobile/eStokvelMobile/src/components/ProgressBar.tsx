import React from 'react';
import { View } from 'react-native';

interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
}

export const ProgressBar = ({ progress, color = '#0A2463', height = 8 }: ProgressBarProps) => (
  <View style={{ height, backgroundColor: '#E5E7EB', borderRadius: height / 2, overflow: 'hidden' }}>
    <View
      style={{
        height: '100%',
        width: `${Math.min(100, Math.max(0, progress))}%`,
        backgroundColor: color,
        borderRadius: height / 2,
      }}
    />
  </View>
);
