import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, IconName } from '../components/Icon';
import { COLORS } from '../constants/theme';
import { scaleFontSize } from '../utils/responsive';

interface LandingScreenProps {
  onGetStarted: () => void;
}

export const LandingScreen = ({ onGetStarted }: LandingScreenProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const btnFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo + title fade in
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start(() => {
      // Then button fades in
      Animated.timing(btnFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    });
  }, []);

  return (
    <SafeAreaView style={landing.container}>
      {/* Gradient-like background with overlay circles */}
      <View style={landing.bgCircle1} />
      <View style={landing.bgCircle2} />

      {/* Main content */}
      <Animated.View style={[landing.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Icon */}
        <View style={landing.logoOuter}>
          <View style={landing.logoInner}>
            <Icon name="account-balance-wallet" size={52} color="#fff" />
          </View>
        </View>

        {/* App name */}
        <Text style={landing.appName}>eStokvel</Text>
        <Text style={landing.tagline}>Your Trusted Stokvel{'\n'}Management Platform</Text>

        {/* Feature highlights */}
        <View style={landing.features}>
          {([
            { icon: 'shield' as IconName, label: 'Secure & Private' },
            { icon: 'groups' as IconName, label: 'Group Savings' },
            { icon: 'payments' as IconName, label: 'Digital Payments' },
          ]).map((f) => (
            <View key={f.label} style={landing.featureItem}>
              <View style={landing.featureIcon}>
                <Icon name={f.icon} size={20} color={COLORS.secondary} />
              </View>
              <Text style={landing.featureText}>{f.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* CTA Button */}
      <Animated.View style={[landing.bottomSection, { opacity: btnFade }]}>
        <TouchableOpacity
          style={landing.ctaButton}
          onPress={onGetStarted}
          activeOpacity={0.85}
          accessibilityLabel="Sign in to eStokvel"
          accessibilityRole="button"
        >
          <Text style={landing.ctaButtonText}>Sign In</Text>
          <Icon name="arrow-forward" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={landing.version}>eStokvel v2.0.0 · Proudly South African 🇿🇦</Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const landing = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
  },
  bgCircle1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -180,
    right: -150,
  },
  bgCircle2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: -100,
    left: -120,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoOuter: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  logoInner: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 12 }),
  },
  appName: {
    fontSize: scaleFontSize(42),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  tagline: {
    fontSize: scaleFontSize(16),
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.3,
    marginBottom: 40,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: scaleFontSize(11),
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  bottomSection: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'web' ? 40 : 24,
    alignItems: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.secondary,
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 6px 24px rgba(212,160,23,0.4)' }
      : { shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }),
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: scaleFontSize(18),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  version: {
    marginTop: 20,
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.3,
  },
});
