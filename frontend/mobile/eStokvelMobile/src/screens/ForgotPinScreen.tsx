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

interface ForgotPinScreenProps {
  onNavigate: (screen: string) => void;
}

type Step = 'phone' | 'otp' | 'newpin';

export const ForgotPinScreen = ({ onNavigate }: ForgotPinScreenProps) => {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Step 1: Request OTP
  const handleRequestOTP = async () => {
    if (!phone || phone.length < 10) {
      showAlert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-pin/request`, { phoneNumber: phone });
      if (response.data.success) {
        setStep('otp');
        setCountdown(60);
        showAlert('OTP Sent', 'If your number is registered, you will receive an OTP via SMS.');
      } else {
        showAlert('Error', response.data.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      showAlert('Error', error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      showAlert('Error', 'Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-pin/verify`, { phoneNumber: phone, otp });
      if (response.data.success) {
        setSessionToken(response.data.data.sessionToken);
        setStep('newpin');
      } else {
        showAlert('Error', response.data.message || 'Invalid OTP');
      }
    } catch (error: any) {
      showAlert('Error', error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set new PIN
  const handleResetPin = async () => {
    if (!newPin || newPin.length !== 6) {
      showAlert('Error', 'Please enter a 6-digit PIN');
      return;
    }
    if (newPin !== confirmPin) {
      showAlert('Error', 'PINs do not match');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-pin/reset`, { sessionToken, newPin });
      if (response.data.success) {
        showAlert('Success', 'Your PIN has been reset successfully. You can now log in.', [
          { text: 'OK', onPress: () => onNavigate('login') },
        ]);
      } else {
        showAlert('Error', response.data.message || 'Failed to reset PIN');
      }
    } catch (error: any) {
      showAlert('Error', error.response?.data?.message || 'PIN reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    await handleRequestOTP();
  };

  const stepTitle = step === 'phone' ? 'Reset PIN' : step === 'otp' ? 'Enter OTP' : 'Set New PIN';
  const stepDesc = step === 'phone'
    ? 'Enter your phone number to receive a verification code.'
    : step === 'otp'
    ? 'Enter the 6-digit code sent to your phone.'
    : 'Choose a new 6-digit PIN for your account.';

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0A2463', '#0F3285', '#1A43A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => step === 'phone' ? onNavigate('login') : setStep(step === 'otp' ? 'phone' : 'otp')} style={s.backBtn}>
              <Icon name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>{stepTitle}</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
          <Animated.View style={[s.card, { opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
            
            {/* Step indicator */}
            <View style={s.stepRow}>
              {[1, 2, 3].map((n) => (
                <View key={n} style={s.stepItem}>
                  <View style={[s.stepCircle, (step === 'phone' && n === 1) || (step === 'otp' && n === 2) || (step === 'newpin' && n === 3) ? s.stepActive : n < (step === 'phone' ? 1 : step === 'otp' ? 2 : 3) ? s.stepDone : null]}>
                    <Text style={[s.stepNum, ((step === 'phone' && n === 1) || (step === 'otp' && n === 2) || (step === 'newpin' && n === 3)) && s.stepNumActive]}>
                      {n}
                    </Text>
                  </View>
                  <Text style={s.stepLabel}>{n === 1 ? 'Phone' : n === 2 ? 'Verify' : 'New PIN'}</Text>
                </View>
              ))}
            </View>

            <Text style={s.desc}>{stepDesc}</Text>

            {/* Step 1: Phone number */}
            {step === 'phone' && (
              <View style={s.fieldGroup}>
                <View style={s.labelRow}>
                  <View style={s.labelIconBg}><Icon name="phone" size={14} color={COLORS.primary} /></View>
                  <Text style={s.label}>Phone Number</Text>
                </View>
                <View style={s.inputWrap}>
                  <Text style={s.inputPrefix}>+27</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor="#94A3B8"
                    value={phone}
                    onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>
            )}

            {/* Step 2: OTP */}
            {step === 'otp' && (
              <View style={s.fieldGroup}>
                <View style={s.labelRow}>
                  <View style={s.labelIconBg}><Icon name="check-circle" size={14} color={COLORS.primary} /></View>
                  <Text style={s.label}>Verification Code</Text>
                </View>
                <View style={s.inputWrap}>
                  <TextInput
                    style={[s.input, { textAlign: 'center', letterSpacing: 8, fontSize: 24 }]}
                    placeholder="000000"
                    placeholderTextColor="#94A3B8"
                    value={otp}
                    onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <TouchableOpacity onPress={handleResendOTP} disabled={countdown > 0} style={s.resendBtn}>
                  <Text style={[s.resendText, countdown > 0 && { color: '#CBD5E1' }]}>
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3: New PIN */}
            {step === 'newpin' && (
              <>
                <View style={s.fieldGroup}>
                  <View style={s.labelRow}>
                    <View style={s.labelIconBg}><Icon name="lock" size={14} color={COLORS.primary} /></View>
                    <Text style={s.label}>New 5-Digit PIN</Text>
                  </View>
                  <View style={s.inputWrap}>
                    <TextInput
                      style={[s.input, { flex: 1 }]}
                      placeholder="Enter new PIN"
                      placeholderTextColor="#94A3B8"
                      value={newPin}
                      onChangeText={(t) => setNewPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
                      secureTextEntry={!showPin}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <TouchableOpacity onPress={() => setShowPin(!showPin)} style={s.eyeBtn}>
                      <Icon name={showPin ? 'visibility-off' : 'visibility'} size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={s.fieldGroup}>
                  <View style={s.labelRow}>
                    <View style={s.labelIconBg}><Icon name="lock" size={14} color={COLORS.primary} /></View>
                    <Text style={s.label}>Confirm New PIN</Text>
                  </View>
                  <View style={s.inputWrap}>
                    <TextInput
                      style={[s.input, { flex: 1 }]}
                      placeholder="Confirm PIN"
                      placeholderTextColor="#94A3B8"
                      value={confirmPin}
                      onChangeText={(t) => setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
                      secureTextEntry={!showPin}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>
              </>
            )}

            {/* Action button */}
            <TouchableOpacity
              style={[s.actionBtn, loading && { opacity: 0.6 }]}
              onPress={step === 'phone' ? handleRequestOTP : step === 'otp' ? handleVerifyOTP : handleResetPin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={s.actionText}>
                    {step === 'phone' ? 'Send OTP' : step === 'otp' ? 'Verify Code' : 'Reset PIN'}
                  </Text>
                  <Icon name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity onPress={() => onNavigate('login')} style={s.footerLink}>
            <Text style={s.footerText}>Back to Login</Text>
          </TouchableOpacity>
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
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: scaleFontSize(20), fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: RADIUS.xxl, padding: SPACING.lg,
    marginTop: SPACING.sm, ...shadow(8, 30, 0.08),
  },
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: SPACING.lg },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
  },
  stepActive: { backgroundColor: COLORS.primary },
  stepDone: { backgroundColor: '#10B981' },
  stepNum: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  stepNumActive: { color: '#FFFFFF' },
  stepLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  desc: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: SPACING.lg, lineHeight: 20 },
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
  inputPrefix: { paddingLeft: SPACING.md, fontSize: 15, fontWeight: '600', color: '#94A3B8' },
  input: { flex: 1, paddingHorizontal: SPACING.md, paddingVertical: 16, fontSize: 16, color: '#1E293B' },
  eyeBtn: { paddingHorizontal: SPACING.md, paddingVertical: 16 },
  resendBtn: { alignSelf: 'flex-end', marginTop: 8 },
  resendText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 18, marginTop: SPACING.sm, ...shadow(4, 16, 0.2),
  },
  actionText: { color: '#FFFFFF', fontSize: scaleFontSize(16), fontWeight: '700', letterSpacing: 0.3 },
  footerLink: { alignSelf: 'center', marginTop: SPACING.xl },
  footerText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
});
