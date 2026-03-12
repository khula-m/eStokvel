import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, Platform, Animated, StyleSheet,
  KeyboardAvoidingView,
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
import { AuthState } from '../types';

interface ChangePinScreenProps {
  auth: AuthState;
  onNavigate: (screen: string) => void;
}

export const ChangePinScreen = ({ auth, onNavigate }: ChangePinScreenProps) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }).start();
  }, []);

  const handleChangePin = async () => {
    if (!currentPin || currentPin.length !== 5) { showAlert('Error', 'Please enter your current 5-digit PIN'); return; }
    if (!newPin || newPin.length !== 5) { showAlert('Error', 'Please enter a new 5-digit PIN'); return; }
    if (newPin !== confirmPin) { showAlert('Error', 'New PINs do not match'); return; }
    if (newPin === currentPin) { showAlert('Error', 'New PIN must be different from your current PIN'); return; }
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      const response = await axios.post(`${API_URL}/api/auth/change-pin`, { currentPin, newPin }, { headers });
      if (response.data.success) {
        showAlert('Success', 'Your PIN has been changed successfully.', [{ text: 'OK', onPress: () => onNavigate(auth.user?.needsIdVerification ? 'id-verification' : 'main') }]);
      } else { showAlert('Error', response.data.message || 'Failed to change PIN'); }
    } catch (error: any) {
      showAlert('Error', error.response?.data?.message || error.message || 'Failed to change PIN');
    } finally { setLoading(false); }
  };

  const backTarget = auth.user?.mustChangePin ? 'landing' : 'main';
  const pinsMatch = newPin.length === 5 && confirmPin.length === 5;

  return (
    <View style={cs.root}>
      {/* Gradient header */}
      <LinearGradient colors={['#0A2463', '#0F3285', '#1A43A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cs.header}>
        <SafeAreaView edges={['top']}>
          <TouchableOpacity onPress={() => onNavigate(backTarget)} style={cs.backBtn} activeOpacity={0.6}>
            <Icon name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={cs.headerContent}>
            <View style={cs.logoWrap}>
              <Icon name="lock" size={26} color="#FFFFFF" />
            </View>
            <Text style={cs.headerTitle}>Change PIN</Text>
            <Text style={cs.headerSub}>
              {auth.user?.mustChangePin ? 'Set a new PIN to continue' : 'Update your security PIN'}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView style={cs.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={cs.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
          <Animated.View style={[cs.card, {
            opacity: cardAnim,
            transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
          }]}>
            {auth.user?.mustChangePin && (
              <View style={cs.notice}>
                <Icon name="info" size={18} color="#D97706" />
                <Text style={cs.noticeText}>You must change your temporary PIN before continuing</Text>
              </View>
            )}

            {/* Current PIN */}
            <View style={cs.fieldGroup}>
              <View style={cs.labelRow}>
                <View style={[cs.labelIconBg, { backgroundColor: COLORS.warningSoft }]}>
                  <Icon name="lock-outline" size={14} color="#D97706" />
                </View>
                <Text style={cs.label}>Current PIN</Text>
              </View>
              <TextInput
                style={cs.pinInput}
                placeholder="• • • • •"
                placeholderTextColor="#CBD5E1"
                value={currentPin}
                onChangeText={(t) => setCurrentPin(t.replace(/[^0-9]/g, '').slice(0, 5))}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={5}
              />
            </View>

            {/* New PIN */}
            <View style={cs.fieldGroup}>
              <View style={cs.labelRow}>
                <View style={cs.labelIconBg}>
                  <Icon name="lock" size={14} color={COLORS.primary} />
                </View>
                <Text style={cs.label}>New PIN</Text>
              </View>
              <TextInput
                style={cs.pinInput}
                placeholder="• • • • •"
                placeholderTextColor="#CBD5E1"
                value={newPin}
                onChangeText={(t) => setNewPin(t.replace(/[^0-9]/g, '').slice(0, 5))}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={5}
              />
            </View>

            {/* Confirm PIN */}
            <View style={cs.fieldGroup}>
              <View style={cs.labelRow}>
                <View style={cs.labelIconBg}>
                  <Icon name="lock" size={14} color={COLORS.primary} />
                </View>
                <Text style={cs.label}>Confirm New PIN</Text>
              </View>
              <TextInput
                style={[cs.pinInput, pinsMatch && newPin !== confirmPin && { borderColor: COLORS.error }]}
                placeholder="• • • • •"
                placeholderTextColor="#CBD5E1"
                value={confirmPin}
                onChangeText={(t) => setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 5))}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={5}
              />
              {pinsMatch && (
                <View style={cs.matchRow}>
                  <Icon name={newPin === confirmPin ? 'check-circle' : 'cancel'} size={16}
                    color={newPin === confirmPin ? COLORS.success : COLORS.error} />
                  <Text style={[cs.matchText, { color: newPin === confirmPin ? COLORS.success : COLORS.error }]}>
                    {newPin === confirmPin ? 'PINs match' : 'PINs do not match'}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={[cs.submitBtn, loading && { opacity: 0.6 }]} onPress={handleChangePin} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={cs.submitText}>Change PIN</Text>
                  <Icon name="check-circle" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity onPress={() => onNavigate(backTarget)} style={cs.footerLink}>
            <Icon name="arrow-back" size={16} color={COLORS.primary} />
            <Text style={cs.footerLinkText}>{auth.user?.mustChangePin ? 'Back to Login' : 'Back to Dashboard'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
  flex: { flex: 1 },
  header: { paddingBottom: 48 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: SPACING.md, marginTop: SPACING.sm,
  },
  headerContent: { alignItems: 'center', paddingVertical: SPACING.lg },
  logoWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: scaleFontSize(26), fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: scaleFontSize(14), color: 'rgba(255,255,255,0.6)', marginTop: 6,
  },
  scrollContent: { flexGrow: 1, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: RADIUS.xxl, padding: SPACING.lg,
    marginTop: -28,
    ...shadow(8, 30, 0.08),
  },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: '#FEF3C7',
  },
  noticeText: { flex: 1, fontSize: 13, color: '#92400E', fontWeight: '500', lineHeight: 18 },
  fieldGroup: { marginBottom: SPACING.lg },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  labelIconBg: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center', alignItems: 'center',
  },
  label: { fontSize: 13, fontWeight: '600', color: '#475569' },
  pinInput: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingVertical: 18, paddingHorizontal: SPACING.md,
    textAlign: 'center', fontSize: 24, letterSpacing: 14,
    color: '#1E293B', fontWeight: '700',
  },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  matchText: { fontSize: 12, fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 18, marginTop: SPACING.sm,
    ...shadow(4, 16, 0.2),
  },
  submitText: { color: '#FFFFFF', fontSize: scaleFontSize(16), fontWeight: '700', letterSpacing: 0.3 },
  footerLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: SPACING.xl,
  },
  footerLinkText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
});
