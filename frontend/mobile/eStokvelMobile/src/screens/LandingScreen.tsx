import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet, Platform, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../components/Icon';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { scaleFontSize } from '../utils/responsive';
import { shadow } from '../utils/shadow';

interface LandingScreenProps {
  onGetStarted: () => void;
}

export const LandingScreen = ({ onGetStarted }: LandingScreenProps) => {
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpac = useRef(new Animated.Value(0)).current;
  const brandOpac = useRef(new Animated.Value(0)).current;
  const ctaOpac = useRef(new Animated.Value(0)).current;
  const ctaSlide = useRef(new Animated.Value(30)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const ringPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOpac, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(brandOpac, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(ctaOpac, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(ctaSlide, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -10, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1.08, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={s.root}>
      <LinearGradient
        colors={['#0A2463', '#0F3285', '#1A43A8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.gradient}
      >
        <SafeAreaView style={s.safe}>
          <View style={s.decoCircle1} />
          <View style={s.decoCircle2} />

          {/* Wallet centered vertically */}
          <View style={s.center}>
            <Animated.View style={[s.logoRingOuter, { transform: [{ scale: ringPulse }] }]}>
              <Animated.View style={[
                s.logoInner,
                { opacity: logoOpac, transform: [{ scale: logoScale }, { translateY: floatY }] },
              ]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.08)']}
                  style={s.logoGradient}
                >
                  <Icon name="account-balance-wallet" size={52} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
            </Animated.View>

            <Animated.Text style={[s.brand, { opacity: brandOpac }]}>eStokvel</Animated.Text>
          </View>

          {/* CTA pinned bottom */}
          <Animated.View style={[s.ctaArea, { opacity: ctaOpac, transform: [{ translateY: ctaSlide }] }]}>
            <TouchableOpacity
              style={s.ctaBtn}
              onPress={onGetStarted}
              activeOpacity={0.85}
              accessibilityLabel="Get started with eStokvel"
              accessibilityRole="button"
            >
              <Text style={s.ctaBtnText}>Get Started</Text>
              <View style={s.ctaArrow}>
                <Icon name="arrow-forward" size={20} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  gradient: { flex: 1 },
  safe: { flex: 1 },

  decoCircle1: {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.035)', top: -90, right: -90,
  },
  decoCircle2: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.025)', bottom: 80, left: -80,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoRingOuter: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xl,
  },
  logoInner: { width: 116, height: 116, borderRadius: 58, overflow: 'hidden' },
  logoGradient: {
    width: 116, height: 116, borderRadius: 58,
    justifyContent: 'center', alignItems: 'center',
  },
  brand: {
    fontSize: scaleFontSize(42),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.8,
    textAlign: 'center',
  },

  ctaArea: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'android' ? SPACING.lg : SPACING.md,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, backgroundColor: '#FFFFFF', width: '100%',
    paddingVertical: 18, borderRadius: RADIUS.lg,
    ...shadow(8, 30, 0.25),
  },
  ctaBtnText: {
    color: COLORS.primary, fontSize: scaleFontSize(17),
    fontWeight: '800', letterSpacing: 0.4,
  },
  ctaArrow: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
  },
});

