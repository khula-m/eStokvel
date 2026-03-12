import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, ScrollView, Platform, Animated, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Icon } from '../components/Icon';
import { showAlert } from '../utils/alert';
import { API_URL } from '../constants/config';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { scaleFontSize } from '../utils/responsive';
import { shadow } from '../utils/shadow';

interface IdVerificationScreenProps {
  auth: { user: any; token: string | null };
  onNavigate: (screen: string) => void;
}

export const IdVerificationScreen = ({ auth, onNavigate }: IdVerificationScreenProps) => {
  const [idNumber, setIdNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }).start();
  }, []);

  const handleSubmit = async () => {
    if (!idNumber || idNumber.length !== 13) {
      showAlert('Error', 'Please enter a valid 13-digit SA ID number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/submit-id`,
        { idNumber: idNumber.trim() },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );

      if (response.data.success) {
        showAlert(
          'ID Submitted',
          'Your identity will be verified shortly. You can continue using the app.',
          [{ text: 'Continue', onPress: () => onNavigate('main') }]
        );
      } else {
        showAlert('Error', response.data.message || 'Failed to submit ID');
      }
    } catch (error: any) {
      showAlert('Error', error.response?.data?.message || 'Failed to submit ID');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    showAlert(
      'Skip ID Verification?',
      'You can use the app without verifying your identity, but payouts will only be available after verification.',
      [
        { text: 'Enter ID Now', style: 'cancel' },
        { text: 'Skip for Now', onPress: () => onNavigate('main') },
      ]
    );
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0A2463', '#0F3285', '#1A43A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <View style={{ width: 40 }} />
            <Text style={s.headerTitle}>Verify Your Identity</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
          <Animated.View style={[s.card, { opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>

            {/* Shield icon */}
            <View style={s.iconContainer}>
              <View style={s.iconBg}>
                <Icon name="verified-user" size={32} color={COLORS.primary} />
              </View>
            </View>

            <Text style={s.title}>Identity Verification</Text>
            <Text style={s.desc}>
              Please enter your South African ID number to verify your identity. This is required to receive payouts.
            </Text>

            {/* Privacy notice */}
            <View style={s.privacyRow}>
              <Icon name="lock" size={14} color="#059669" />
              <Text style={s.privacyText}>
                Your ID number is encrypted and never shared with other users or admins.
              </Text>
            </View>

            {/* ID Number */}
            <View style={s.fieldGroup}>
              <View style={s.labelRow}>
                <View style={s.labelIconBg}><Icon name="badge" size={14} color={COLORS.primary} /></View>
                <Text style={s.label}>SA ID Number</Text>
              </View>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  placeholder="Enter 13-digit ID number"
                  placeholderTextColor="#94A3B8"
                  value={idNumber}
                  onChangeText={(t) => setIdNumber(t.replace(/[^0-9]/g, '').slice(0, 13))}
                  keyboardType="number-pad"
                  maxLength={13}
                  autoFocus
                />
              </View>
              {idNumber.length > 0 && idNumber.length < 13 && (
                <Text style={s.fieldHint}>{13 - idNumber.length} digits remaining</Text>
              )}
              {idNumber.length === 13 && (
                <Text style={[s.fieldHint, { color: '#059669' }]}>Ready to verify</Text>
              )}
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[s.actionBtn, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading || idNumber.length !== 13}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Icon name="verified-user" size={18} color="#FFFFFF" />
                  <Text style={s.actionText}>Verify My Identity</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Skip link */}
            <TouchableOpacity onPress={handleSkip} style={s.skipLink}>
              <Text style={s.skipText}>Skip for now</Text>
            </TouchableOpacity>

            {/* Info */}
            <View style={s.infoRow}>
              <Icon name="info" size={16} color="#64748B" />
              <Text style={s.infoText}>
                Verification typically takes a few minutes. You'll be notified once complete. Payouts require a verified identity.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
  flex: { flex: 1 },
  header: { paddingBottom: SPACING.md },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  headerTitle: { fontSize: scaleFontSize(20), fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: RADIUS.xxl, padding: SPACING.lg,
    marginTop: SPACING.sm, ...shadow(8, 30, 0.08),
  },
  iconContainer: { alignItems: 'center', marginBottom: SPACING.md },
  iconBg: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: COLORS.primarySoft, justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: scaleFontSize(22), fontWeight: '700', color: '#1E293B', textAlign: 'center', marginBottom: 8 },
  desc: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: SPACING.md, lineHeight: 20 },
  privacyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: SPACING.sm, backgroundColor: '#ECFDF5', borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  privacyText: { flex: 1, fontSize: 12, color: '#059669', lineHeight: 16 },
  fieldGroup: { marginBottom: SPACING.lg },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  labelIconBg: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.primarySoft, justifyContent: 'center', alignItems: 'center',
  },
  label: { fontSize: 13, fontWeight: '600', color: '#475569' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  input: { flex: 1, paddingHorizontal: SPACING.md, paddingVertical: 16, fontSize: 16, color: '#1E293B' },
  fieldHint: { fontSize: 11, color: '#94A3B8', marginTop: 4, paddingLeft: 4 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 18, marginTop: SPACING.sm, ...shadow(4, 16, 0.2),
  },
  actionText: { color: '#FFFFFF', fontSize: scaleFontSize(16), fontWeight: '700', letterSpacing: 0.3 },
  skipLink: { alignSelf: 'center', marginTop: SPACING.lg },
  skipText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: SPACING.lg, padding: SPACING.md,
    backgroundColor: '#F0F9FF', borderRadius: RADIUS.md,
  },
  infoText: { flex: 1, fontSize: 12, color: '#64748B', lineHeight: 18 },
});
