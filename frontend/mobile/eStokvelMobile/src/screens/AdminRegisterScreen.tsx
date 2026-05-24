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

interface AdminRegisterScreenProps {
  onNavigate: (screen: string) => void;
}

export const AdminRegisterScreen = ({ onNavigate }: AdminRegisterScreenProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }).start();
  }, []);

  const handleRegister = async () => {
    if (!firstName || firstName.trim().length < 2) {
      showAlert('Error', 'Please enter your first name (at least 2 characters)');
      return;
    }
    if (!lastName || lastName.trim().length < 1) {
      showAlert('Error', 'Please enter your last name');
      return;
    }
    if (!phone || phone.length < 10) {
      showAlert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }
    if (!idNumber || idNumber.length !== 13) {
      showAlert('Error', 'Please enter a valid 13-digit SA ID number');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/admin/register`, {
        phoneNumber: phone,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        idNumber: idNumber.trim(),
      }, { timeout: 15000 });
      if (response.data.success) {
        const tempPin = response.data.data?.tempPin;
        const pinMsg = tempPin
          ? `Your temporary PIN is: ${tempPin}\n\nWrite it down — you will need it to log in. Change it on first login.`
          : 'A temporary PIN has been sent to your phone via SMS. Please log in and change your PIN.';
        showAlert('Registration Successful', pinMsg, [{ text: 'Go to Login', onPress: () => onNavigate('login') }]);
      } else {
        showAlert('Error', response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      showAlert('Error', error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0A2463', '#0F3285', '#1A43A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => onNavigate('login')} style={s.backBtn}>
              <Icon name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Register as Admin</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
          <Animated.View style={[s.card, { opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
            
            <Text style={s.desc}>
              Register as a Group Admin to create and manage stokvel groups. A temporary PIN will be sent to your phone.
            </Text>

            {/* First Name */}
            <View style={s.fieldGroup}>
              <View style={s.labelRow}>
                <View style={s.labelIconBg}><Icon name="person" size={14} color={COLORS.primary} /></View>
                <Text style={s.label}>First Name</Text>
              </View>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  placeholder="Enter your first name"
                  placeholderTextColor="#94A3B8"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  maxLength={50}
                />
              </View>
            </View>

            {/* Last Name */}
            <View style={s.fieldGroup}>
              <View style={s.labelRow}>
                <View style={s.labelIconBg}><Icon name="person" size={14} color={COLORS.primary} /></View>
                <Text style={s.label}>Last Name</Text>
              </View>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  placeholder="Enter your last name"
                  placeholderTextColor="#94A3B8"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  maxLength={50}
                />
              </View>
            </View>

            {/* Phone */}
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

            {/* SA ID Number */}
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
                />
              </View>
              {idNumber.length > 0 && idNumber.length < 13 && (
                <Text style={s.fieldHint}>{13 - idNumber.length} digits remaining</Text>
              )}
            </View>

            {/* Register button */}
            <TouchableOpacity
              style={[s.actionBtn, loading && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={s.actionText}>Register</Text>
                  <Icon name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Info */}
            <View style={s.infoRow}>
              <Icon name="info" size={16} color="#64748B" />
              <Text style={s.infoText}>
                After registration, log in with your phone number and the PIN sent via SMS. You'll be prompted to change your PIN on first login.
              </Text>
            </View>
          </Animated.View>

          <TouchableOpacity onPress={() => onNavigate('login')} style={s.footerLink}>
            <Text style={s.footerText}>Already have an account? Sign In</Text>
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
  fieldHint: { fontSize: 11, color: '#94A3B8', marginTop: 4, paddingLeft: 4 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 18, marginTop: SPACING.sm, ...shadow(4, 16, 0.2),
  },
  actionText: { color: '#FFFFFF', fontSize: scaleFontSize(16), fontWeight: '700', letterSpacing: 0.3 },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: SPACING.lg, padding: SPACING.md,
    backgroundColor: '#F0F9FF', borderRadius: RADIUS.md,
  },
  infoText: { flex: 1, fontSize: 12, color: '#64748B', lineHeight: 18 },
  footerLink: { alignSelf: 'center', marginTop: SPACING.xl },
  footerText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
});
