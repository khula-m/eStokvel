import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet, Platform, ScrollView, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, IconName } from '../components/Icon';
import { COLORS } from '../constants/theme';
import { scaleFontSize } from '../utils/responsive';

const shadow = (offsetY: number, blur: number, opacity: number): any =>
  Platform.OS === 'web'
    ? { boxShadow: `0 ${offsetY}px ${blur}px rgba(0,0,0,${opacity})` }
    : { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: blur / 2, elevation: Math.round(blur / 2) };

interface LandingScreenProps {
  onGetStarted: () => void;
}

/* ── Interactive feature card ── */
const FeatureCard = ({ icon, title, desc, tint, bg, anim, index }: {
  icon: IconName; title: string; desc: string; tint: string; bg: string;
  anim: Animated.Value; index: number;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const [expanded, setExpanded] = useState(false);

  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    setExpanded(!expanded);
  };

  const details: Record<number, string> = {
    0: 'Your data is encrypted end-to-end. PIN authentication ensures only you can access your account.',
    1: 'Be an admin in one stokvel and a member in another. Full flexibility for modern savings.',
    2: 'See every contribution and payout as it happens. Export reports anytime you need them.',
  };

  return (
    <Animated.View style={{ opacity: anim, transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[s.featureCard, expanded && s.featureCardExpanded]}
      >
        <View style={s.featureCardRow}>
          <View style={[s.featureIcon, { backgroundColor: bg }]}>
            <Icon name={icon} size={24} color={tint} />
          </View>
          <View style={s.featureText}>
            <Text style={s.featureTitle}>{title}</Text>
            <Text style={s.featureDesc}>{desc}</Text>
          </View>
          <Icon name={expanded ? 'expand-less' : 'expand-more'} size={22} color="#94A3B8" />
        </View>
        {expanded && (
          <View style={s.featureDetail}>
            <View style={[s.featureDetailBar, { backgroundColor: tint }]} />
            <Text style={s.featureDetailText}>{details[index]}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const LandingScreen = ({ onGetStarted }: LandingScreenProps) => {
  // ── Entrance animations ──
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(30)).current;
  const statsFade = useRef(new Animated.Value(0)).current;
  const feat1 = useRef(new Animated.Value(0)).current;
  const feat2 = useRef(new Animated.Value(0)).current;
  const feat3 = useRef(new Animated.Value(0)).current;
  const btnFade = useRef(new Animated.Value(0)).current;

  // ── Continuous animations ──
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const btnGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const stagger = (anim: Animated.Value, delay: number) =>
      Animated.timing(anim, { toValue: 1, duration: 500, delay, useNativeDriver: true });

    // Entrance
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      stagger(statsFade, 350),
      stagger(feat1, 500),
      stagger(feat2, 620),
      stagger(feat3, 740),
      stagger(btnFade, 850),
    ]).start();

    // Continuous pulse on logo ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Floating icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Button glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(btnGlow, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(btnGlow, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const features: { icon: IconName; title: string; desc: string; tint: string; bg: string }[] = [
    { icon: 'shield', title: 'Bank-Grade Security', desc: 'PIN-protected & encrypted data storage', tint: COLORS.primary, bg: '#EEF2FF' },
    { icon: 'groups', title: 'Multi-Group Roles', desc: 'Admin in one group, member in another', tint: COLORS.accent, bg: '#ECFDF5' },
    { icon: 'trending-up', title: 'Real-Time Tracking', desc: 'Contributions, payouts & analytics live', tint: '#D97706', bg: '#FFFBEB' },
  ];
  const featAnims = [feat1, feat2, feat3];

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} bounces={false}>

        {/* ══ Hero Banner ══ */}
        <Animated.View style={[s.heroBanner, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
          <View style={s.heroCircle1} />
          <View style={s.heroCircle2} />
          <View style={s.heroCircle3} />

          <Animated.View style={[s.logoRing, { transform: [{ scale: pulseAnim }] }]}>
            <Animated.View style={[s.logoCircle, { transform: [{ translateY: floatAnim }] }]}>
              <Icon name="account-balance-wallet" size={32} color="#fff" />
            </Animated.View>
          </Animated.View>

          <Text style={s.heroTitle}>eStokvel</Text>
          <Text style={s.heroSub}>Community Savings,{'\n'}Digitally Empowered</Text>

          {/* Inline trust badges */}
          <View style={s.heroBadges}>
            <View style={s.heroBadge}>
              <Icon name="check-circle" size={14} color={COLORS.accent} />
              <Text style={s.heroBadgeText}>Verified</Text>
            </View>
            <View style={s.heroBadgeDot} />
            <View style={s.heroBadge}>
              <Icon name="lock" size={14} color={COLORS.secondary} />
              <Text style={s.heroBadgeText}>Encrypted</Text>
            </View>
            <View style={s.heroBadgeDot} />
            <View style={s.heroBadge}>
              <Icon name="flash-on" size={14} color="#F59E0B" />
              <Text style={s.heroBadgeText}>Instant</Text>
            </View>
          </View>
        </Animated.View>

        {/* ══ Trust Indicators ══ */}
        <Animated.View style={[s.statsRow, { opacity: statsFade }]}>
          <View style={s.statItem}>
            <Icon name="lock" size={20} color={COLORS.primary} />
            <Text style={s.statLabel}>PIN Protected</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Icon name="shield" size={20} color={COLORS.accent} />
            <Text style={s.statLabel}>Encrypted</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Icon name="access-time" size={20} color={COLORS.secondary} />
            <Text style={s.statLabel}>24/7 Access</Text>
          </View>
        </Animated.View>

        {/* ══ Interactive Feature Cards ══ */}
        <View style={s.featuresWrap}>
          <Text style={s.sectionLabel}>Why eStokvel?</Text>
          <Text style={s.sectionHint}>Tap a card to learn more</Text>
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} anim={featAnims[i]} index={i} />
          ))}
        </View>

        {/* ══ How It Works ══ */}
        <Animated.View style={[s.stepsSection, { opacity: btnFade }]}>
          <Text style={s.sectionLabel}>How It Works</Text>
          {[
            { step: '1', icon: 'person-add' as IconName, text: 'Your admin creates your account' },
            { step: '2', icon: 'group-add' as IconName, text: 'Join or create stokvel groups' },
            { step: '3', icon: 'attach-money' as IconName, text: 'Contribute & track everything live' },
          ].map((item, i) => (
            <View key={item.step} style={s.stepRow}>
              <View style={s.stepNumberWrap}>
                <Text style={s.stepNumber}>{item.step}</Text>
                {i < 2 && <View style={s.stepLine} />}
              </View>
              <View style={s.stepIconWrap}>
                <Icon name={item.icon} size={20} color={COLORS.primary} />
              </View>
              <Text style={s.stepText}>{item.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ══ CTA ══ */}
        <Animated.View style={[s.ctaWrap, { opacity: btnFade }]}>
          <TouchableOpacity
            style={s.ctaButton}
            onPress={onGetStarted}
            activeOpacity={0.85}
            accessibilityLabel="Sign in to eStokvel"
            accessibilityRole="button"
          >
            <Text style={s.ctaText}>Get Started</Text>
            <Animated.View style={[s.ctaArrow, { opacity: Animated.add(0.6, Animated.multiply(btnGlow, 0.4)) }]}>
              <Icon name="arrow-forward" size={18} color={COLORS.primary} />
            </Animated.View>
          </TouchableOpacity>
          <Text style={s.footerNote}>Community savings, digitally empowered</Text>
          <Text style={s.version}>v2.0.0 · Proudly South African 🇿🇦</Text>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flexGrow: 1, paddingBottom: 36 },

  /* ── Hero ── */
  heroBanner: {
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 48 : 36,
    paddingBottom: 48,
    overflow: 'hidden',
  },
  heroCircle1: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.05)', top: -70, right: -50,
  },
  heroCircle2: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: -40, left: -40,
  },
  heroCircle3: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.03)', top: 40, left: 30,
  },
  logoRing: {
    width: 92, height: 92, borderRadius: 46,
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroTitle: {
    fontSize: scaleFontSize(36), fontWeight: '900', color: '#FFFFFF',
    letterSpacing: 1.5, marginBottom: 8,
  },
  heroSub: {
    fontSize: scaleFontSize(15), color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', lineHeight: 24, letterSpacing: 0.3, marginBottom: 18,
  },
  heroBadges: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroBadgeText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  heroBadgeDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.3)' },

  /* ── Stats ── */
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly',
    marginTop: -28, marginHorizontal: 20,
    backgroundColor: '#fff', borderRadius: 20, paddingVertical: 20,
    ...shadow(6, 24, 0.1),
  },
  statItem: { alignItems: 'center', flex: 1, gap: 6 },
  statLabel: { fontSize: scaleFontSize(11), color: '#64748B', fontWeight: '700', letterSpacing: 0.3 },
  statDivider: { width: 1, height: 32, backgroundColor: '#E5E7EB' },

  /* ── Features ── */
  featuresWrap: { paddingHorizontal: 24, marginTop: 28 },
  sectionLabel: {
    fontSize: scaleFontSize(13), fontWeight: '700', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4,
  },
  sectionHint: {
    fontSize: scaleFontSize(11), color: '#CBD5E1', marginBottom: 14,
  },
  featureCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 12,
    ...shadow(2, 12, 0.06),
  },
  featureCardExpanded: {
    ...shadow(4, 18, 0.1),
  },
  featureCardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  featureIcon: {
    width: 50, height: 50, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: scaleFontSize(15), fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  featureDesc: { fontSize: scaleFontSize(12), color: '#94A3B8', lineHeight: 18 },
  featureDetail: {
    flexDirection: 'row', marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 12,
  },
  featureDetailBar: { width: 3, borderRadius: 2, minHeight: 20 },
  featureDetailText: { flex: 1, fontSize: scaleFontSize(12.5), color: '#64748B', lineHeight: 20 },

  /* ── Steps ── */
  stepsSection: { paddingHorizontal: 24, marginTop: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  stepNumberWrap: { alignItems: 'center', width: 28 },
  stepNumber: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary,
    color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 24,
    overflow: 'hidden',
  },
  stepLine: { width: 2, height: 28, backgroundColor: '#E2E8F0', marginTop: 4 },
  stepIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center', marginHorizontal: 12,
  },
  stepText: { flex: 1, fontSize: scaleFontSize(13.5), color: '#475569', fontWeight: '600', paddingTop: 9 },

  /* ── CTA ── */
  ctaWrap: { paddingHorizontal: 24, marginTop: 28, alignItems: 'center' },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, backgroundColor: COLORS.primary, width: '100%',
    paddingVertical: 18, borderRadius: 16,
    ...shadow(6, 24, 0.22),
  },
  ctaText: { color: '#fff', fontSize: scaleFontSize(17), fontWeight: '800', letterSpacing: 0.4 },
  ctaArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  footerNote: {
    marginTop: 18, fontSize: scaleFontSize(13), color: '#64748B', fontWeight: '500',
  },
  version: { marginTop: 8, fontSize: 11, color: '#CBD5E1', letterSpacing: 0.3 },
});
