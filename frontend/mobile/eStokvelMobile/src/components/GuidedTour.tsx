import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions, Platform, Modal,
} from 'react-native';
import { Icon, IconName } from './Icon';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { scaleFontSize } from '../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const shadow = (offsetY: number, blur: number, opacity: number): any =>
  Platform.OS === 'web'
    ? { boxShadow: `0 ${offsetY}px ${blur}px rgba(0,0,0,${opacity})` }
    : { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: blur / 2, elevation: Math.round(blur / 2) };

export interface TourStep {
  icon: IconName;
  title: string;
  description: string;
  highlight?: string; // tab name or feature to visually emphasize
}

interface GuidedTourProps {
  steps: TourStep[];
  tourKey: string; // unique key per role (e.g., 'admin-tour', 'member-tour')
  onComplete: () => void;
  visible: boolean;
}

const STORAGE_PREFIX = '@estokvel_tour_';

/** Check if user has completed a specific tour */
export async function hasTourCompleted(tourKey: string): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(`${STORAGE_PREFIX}${tourKey}`);
    return val === 'done';
  } catch {
    return false;
  }
}

/** Mark a tour as completed */
export async function markTourComplete(tourKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${tourKey}`, 'done');
  } catch {
    // Silent fail
  }
}

/** Reset tour for testing */
export async function resetTour(tourKey: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${STORAGE_PREFIX}${tourKey}`);
  } catch {
    // Silent fail
  }
}

export const GuidedTour = ({ steps, tourKey, onComplete, visible }: GuidedTourProps) => {
  const [current, setCurrent] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.5)).current;

  const step = steps[current];
  const isLast = current === steps.length - 1;
  const progress = (current + 1) / steps.length;

  useEffect(() => {
    if (visible) {
      animateIn();
    }
  }, [visible, current]);

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    iconScale.setValue(0.5);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.timing(progressAnim, { toValue: progress, duration: 400, useNativeDriver: false }),
    ]).start();
  };

  const handleNext = () => {
    if (isLast) {
      markTourComplete(tourKey);
      onComplete();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setCurrent(c => c + 1);
      });
    }
  };

  const handleSkip = () => {
    markTourComplete(tourKey);
    onComplete();
  };

  if (!visible || !step) return null;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Icon background colors cycle through brand palette
  const iconColors = [
    { bg: '#EEF2FF', fg: COLORS.primary },
    { bg: '#ECFDF5', fg: COLORS.accent },
    { bg: '#FFFBEB', fg: '#D97706' },
    { bg: '#FEF2F2', fg: COLORS.error },
    { bg: '#F0F9FF', fg: '#0284C7' },
    { bg: '#FDF4FF', fg: '#A855F7' },
  ];
  const colorSet = iconColors[current % iconColors.length];

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={s.overlay}>
        <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Progress bar */}
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: progressWidth }]} />
          </View>

          {/* Skip */}
          <View style={s.topRow}>
            <Text style={s.stepCount}>{current + 1} of {steps.length}</Text>
            {!isLast && (
              <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={s.skipText}>Skip Tour</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Icon */}
          <Animated.View style={[s.iconContainer, { backgroundColor: colorSet.bg, transform: [{ scale: iconScale }] }]}>
            <Icon name={step.icon} size={36} color={colorSet.fg} />
          </Animated.View>

          {/* Content */}
          <Text style={s.title}>{step.title}</Text>
          <Text style={s.description}>{step.description}</Text>

          {/* Action */}
          <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={s.nextBtnText}>{isLast ? 'Start Using eStokvel' : 'Next'}</Text>
            <Icon name={isLast ? 'check-circle' : 'arrow-forward'} size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Dots */}
          <View style={s.dotsRow}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[
                  s.dot,
                  i === current && s.dotActive,
                  i < current && s.dotDone,
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

/* ── Tour step presets ── */

export const ADMIN_TOUR_STEPS: TourStep[] = [
  {
    icon: 'dashboard',
    title: 'Welcome, Admin!',
    description: 'This is your command center. View your group\'s finances, manage members, and track contributions all from one place.',
  },
  {
    icon: 'group-add',
    title: 'Create & Manage Groups',
    description: 'Create savings groups, set contribution amounts and frequencies. You\'ll get a unique group code members can use to join.',
  },
  {
    icon: 'person-add',
    title: 'Add Members',
    description: 'Add members by their phone number. They\'ll receive a temporary PIN to login. You can manage their membership anytime.',
  },
  {
    icon: 'attach-money',
    title: 'Track Contributions',
    description: 'Monitor every contribution in the Ledger tab. See who\'s paid, pending amounts, and generate transaction references.',
    highlight: 'ledger',
  },
  {
    icon: 'chat',
    title: 'Group Chat',
    description: 'Communicate with your group members in real-time. Share announcements, reminders, and coordinate meetings.',
    highlight: 'chat',
  },
  {
    icon: 'campaign',
    title: 'Announcements & Meetings',
    description: 'Post important announcements and schedule meetings. Members get notified and can RSVP directly in the app.',
  },
];

export const MEMBER_TOUR_STEPS: TourStep[] = [
  {
    icon: 'account-balance-wallet',
    title: 'Welcome to eStokvel!',
    description: 'Your digital savings companion. View your groups, make contributions, and track your savings progress here.',
  },
  {
    icon: 'groups',
    title: 'Your Groups',
    description: 'You\'ll see all stokvel groups you belong to on the Dashboard. Each shows your role, contribution amount, and group details.',
  },
  {
    icon: 'attach-money',
    title: 'Make Contributions',
    description: 'Tap "Pay Now" on any group to make a contribution via EFT or other payment methods. Every payment is tracked with a reference.',
    highlight: 'ledger',
  },
  {
    icon: 'receipt-long',
    title: 'Your Ledger',
    description: 'The Ledger tab shows your complete transaction history. Filter by type and see your total contributions at a glance.',
    highlight: 'ledger',
  },
  {
    icon: 'chat',
    title: 'Group Chat',
    description: 'Chat with your group members in the Chat tab. Stay connected, ask questions, and coordinate with your savings community.',
    highlight: 'chat',
  },
  {
    icon: 'notifications',
    title: 'Stay Updated',
    description: 'The Alerts tab shows payment confirmations, meeting reminders, and group announcements. Never miss an important update.',
    highlight: 'notifications',
  },
];

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 36, 99, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xxl,
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...shadow(12, 40, 0.2),
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  stepCount: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  skipText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: scaleFontSize(22),
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: scaleFontSize(15),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.sm,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    ...shadow(4, 16, 0.2),
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: scaleFontSize(16),
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  dotDone: {
    backgroundColor: '#94A3B8',
  },
});
