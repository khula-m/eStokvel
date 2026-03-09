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

const shadow = (offsetY: number, blur: number, opacity: number): any =>
  Platform.OS === 'web'
    ? { boxShadow: `0 ${offsetY}px ${blur}px rgba(0,0,0,${opacity})` }
    : { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: blur / 2, elevation: Math.round(blur / 2) };

interface LoginScreenProps {
  onNavigate: (screen: string) => void;
  onLogin: (data: any) => void;
}

export const LoginScreen = ({ onNavigate, onLogin }: LoginScreenProps) => {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }).start();
  }, []);

  const handleLogin = async () => {
    if (!phone || !pin) { showAlert('Error', 'Please enter phone number and PIN'); return; }
    if (pin.length !== 5) { showAlert('Error', 'PIN must be 5 digits'); return; }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { phoneNumber: phone, pin });
      if (response.data.success) {
        const userData = response.data.data;
        onLogin(userData);
        onNavigate(userData.user?.mustChangePin ? 'change-pin' : 'main');
      } else {
        showAlert('Error', response.data.message || 'Login failed');
      }
    } catch (error: any) {
      showAlert('Error', error.response?.data?.message || error.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <View style={ls.root}>
      {/* Gradient header */}
      <LinearGradient colors={['#0A2463', '#0F3285', '#1A43A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ls.header}>
        <SafeAreaView edges={['top']}>
          <TouchableOpacity onPress={() => onNavigate('landing')} style={ls.backBtn} accessibilityLabel="Back to home" accessibilityRole="button">
            <Icon name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={ls.headerContent}>
            <View style={ls.logoWrap}>
              <Icon name="account-balance-wallet" size={28} color="#FFFFFF" />
            </View>
            <Text style={ls.headerTitle}>Welcome Back</Text>
            <Text style={ls.headerSub}>Sign in to manage your stokvel</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Form card */}
      <KeyboardAvoidingView style={ls.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={ls.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
          <Animated.View style={[ls.card, {
            opacity: cardAnim,
            transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
          }]}>
            {/* Phone input */}
            <View style={ls.fieldGroup}>
              <View style={ls.labelRow}>
                <View style={ls.labelIconBg}>
                  <Icon name="phone" size={14} color={COLORS.primary} />
                </View>
                <Text style={ls.label}>Phone Number</Text>
              </View>
              <View style={ls.inputWrap}>
                <Text style={ls.inputPrefix}>+27</Text>
                <TextInput
                  style={ls.input}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor="#94A3B8"
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>

            {/* PIN input */}
            <View style={ls.fieldGroup}>
              <View style={ls.labelRow}>
                <View style={ls.labelIconBg}>
                  <Icon name="lock" size={14} color={COLORS.primary} />
                </View>
                <Text style={ls.label}>5-Digit PIN</Text>
              </View>
              <View style={ls.inputWrap}>
                <TextInput
                  style={[ls.input, { flex: 1 }]}
                  placeholder="Enter your PIN"
                  placeholderTextColor="#94A3B8"
                  value={pin}
                  onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 5))}
                  secureTextEntry={!showPin}
                  keyboardType="number-pad"
                  maxLength={5}
                />
                <TouchableOpacity onPress={() => setShowPin(!showPin)} style={ls.eyeBtn}>
                  <Icon name={showPin ? 'visibility-off' : 'visibility'} size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign in */}
            <TouchableOpacity style={[ls.signInBtn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={ls.signInText}>Sign In</Text>
                  <Icon name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={ls.divider}>
              <View style={ls.dividerLine} />
              <Text style={ls.dividerText}>Secure Login</Text>
              <View style={ls.dividerLine} />
            </View>

            {/* Trust row */}
            <View style={ls.trustRow}>
              <View style={ls.trustItem}><Icon name="lock" size={14} color="#94A3B8" /><Text style={ls.trustText}>PIN Protected</Text></View>
              <View style={ls.trustDot} />
              <View style={ls.trustItem}><Icon name="shield" size={14} color="#94A3B8" /><Text style={ls.trustText}>Encrypted</Text></View>
            </View>
          </Animated.View>

          <Text style={ls.footer}>Contact your group admin to get access</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const ls = StyleSheet.create({
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
  fieldGroup: { marginBottom: SPACING.lg },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  labelIconBg: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center', alignItems: 'center',
  },
  label: { fontSize: 13, fontWeight: '600', color: '#475569' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  inputPrefix: {
    paddingLeft: SPACING.md, fontSize: 15, fontWeight: '600', color: '#94A3B8',
  },
  input: {
    flex: 1, paddingHorizontal: SPACING.md, paddingVertical: 16,
    fontSize: 16, color: '#1E293B',
  },
  eyeBtn: { paddingHorizontal: SPACING.md, paddingVertical: 16 },
  signInBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 18, marginTop: SPACING.sm,
    ...shadow(4, 16, 0.2),
  },
  signInText: { color: '#FFFFFF', fontSize: scaleFontSize(16), fontWeight: '700', letterSpacing: 0.3 },
  divider: {
    flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F1F5F9' },
  dividerText: { marginHorizontal: SPACING.sm, fontSize: 11, color: '#CBD5E1', fontWeight: '600', letterSpacing: 0.5 },
  trustRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  trustDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1' },
  footer: { textAlign: 'center', color: '#94A3B8', fontSize: 13, marginTop: SPACING.xl },
});
