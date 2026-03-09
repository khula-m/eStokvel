import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet, Platform, Dimensions, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, IconName } from '../components/Icon';
import { COLORS, SPACING, RADIUS, FONT } from '../constants/theme';
import { scaleFontSize } from '../utils/responsive';
import { shadow } from '../utils/shadow';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface LandingScreenProps {
  onGetStarted: () => void;
}

/* ── Feature pill ── */
const FeaturePill = ({ icon, label, anim }: {
  icon: IconName; label: string; anim: Animated.Value;
}) => (
  <Animated.View style={[s.pill, { opacity: anim, transform: [{ translateY: Animated.multiply(Animated.subtract(1, anim), 14) }] }]}>
    <View style={s.pillIcon}>
      <Icon name={icon} size={18} color={COLORS.primary} />
    </View>
    <Text style={s.pillLabel}>{label}</Text>
  </Animated.View>
);

export const LandingScreen = ({ onGetStarted }: LandingScreenProps) => {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpac = useRef(new Animated.Value(0)).current;
  const titleOpac = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(20)).current;
  const pill1 = useRef(new Animated.Value(0)).current;
  const pill2 = useRef(new Animated.Value(0)).current;
  const pill3 = useRef(new Animated.Value(0)).current;
  const ctaOpac = useRef(new Animated.Value(0)).current;
  const ctaSlide = useRef(new Animated.Value(30)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const ringPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOpac, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpac, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(titleSlide, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.stagger(120, [
        Animated.timing(pill1, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(pill2, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(pill3, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(ctaOpac, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(ctaSlide, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -8, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1.06, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
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
          <View style={s.decoCircle3} />

          <View style={s.topSpacer} />

          {/* Logo */}
          <View style={s.logoArea}>
            <Animated.View style={[s.logoRingOuter, { transform: [{ scale: ringPulse }] }]}>
              <Animated.View style={[
                s.logoInner,
                { opacity: logoOpac, transform: [{ scale: logoScale }, { translateY: floatY }] },
              ]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.08)']}
                  style={s.logoGradient}
                >
                  <Icon name="account-balance-wallet" size={40} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
            </Animated.View>

            <Animated.View style={{ opacity: titleOpac, transform: [{ translateY: titleSlide }] }}>
              <Text style={s.brand}>eStokvel</Text>
              <Text style={s.tagline}>Community Savings,{'\n'}Digitally Empowered</Text>
            </Animated.View>
          </View>

          {/* Feature pills */}
          <View style={s.pillsContainer}>
            <FeaturePill icon="shield" label="Bank-Grade Security" anim={pill1} />
            <FeaturePill icon="groups" label="Multi-Group Support" anim={pill2} />
            <FeaturePill icon="trending-up" label="Real-Time Tracking" anim={pill3} />
          </View>

          {/* CTA */}
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

            <View style={s.trustRow}>
              {[
                { icon: 'lock' as IconName, text: 'PIN Protected' },
                { icon: 'shield' as IconName, text: 'Encrypted' },
                { icon: 'access-time' as IconName, text: '24/7 Access' },
              ].map((t, i) => (
                <React.Fragment key={t.text}>
                  {i > 0 && <View style={s.trustDot} />}
                  <View style={s.trustItem}>
                    <Icon name={t.icon} size={14} color="rgba(255,255,255,0.5)" />
                    <Text style={s.trustText}>{t.text}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            <Text style={s.version}>v2.0 · Proudly South African 🇿🇦</Text>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  gradient: { flex: 1 },
  safe: { flex: 1, justifyContent: 'space-between' },
  topSpacer: { height: SCREEN_H * 0.04 },

  decoCircle1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.03)', top: -80, right: -80,
  },
  decoCircle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.025)', bottom: 120, left: -60,
  },
  decoCircle3: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.02)', top: '30%' as any, left: '60%' as any,
  },

  logoArea: { alignItems: 'center', paddingHorizontal: SPACING.lg },
  logoRingOuter: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg,
  },
  logoInner: { width: 88, height: 88, borderRadius: 44, overflow: 'hidden' },
  logoGradient: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  brand: {
    fontSize: scaleFontSize(36),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  tagline: {
    fontSize: scaleFontSize(15),
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.3,
  },

  pillsContainer: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: SPACING.sm, paddingHorizontal: SPACING.lg,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999, paddingHorizontal: SPACING.md, paddingVertical: 10,
    gap: SPACING.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  pillIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center', alignItems: 'center',
  },
  pillLabel: {
    fontSize: scaleFontSize(13), color: 'rgba(255,255,255,0.85)', fontWeight: '600',
  },

  ctaArea: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'android' ? SPACING.lg : SPACING.md,
    alignItems: 'center',
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

  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.lg },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  trustDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.2)' },
  version: { marginTop: SPACING.md, fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: 0.3 },
});
