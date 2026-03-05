import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { Icon } from '../components/Icon';
import { showAlert } from '../utils/alert';
import { API_URL } from '../constants/config';
import { COLORS } from '../constants/theme';
import { styles } from '../styles';

interface LoginScreenProps {
  onNavigate: (screen: string) => void;
  onLogin: (data: any) => void;
}

export const LoginScreen = ({ onNavigate, onLogin }: LoginScreenProps) => {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.authScrollContent} keyboardShouldPersistTaps="handled">
        {/* Back to Landing */}
        <TouchableOpacity
          onPress={() => onNavigate('landing')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}
          accessibilityLabel="Back to home" accessibilityRole="button"
        >
          <Icon name="arrow-back" size={22} color={COLORS.primary} />
          <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 15 }}>Back</Text>
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Icon name="account-balance-wallet" size={36} color="#fff" />
          </View>
          <Text style={styles.logoTitle}>eStokvel</Text>
          <Text style={styles.logoTagline}>Your Trusted Stokvel Management Platform</Text>
        </View>
        <View style={styles.authCard}>
          <Text style={styles.authCardTitle}>Welcome Back!</Text>
          <Text style={styles.authCardSubtitle}>Sign in with your phone number and PIN</Text>
          <View style={styles.inputContainer}>
            <View style={styles.inputLabelRow}>
              <Icon name="phone" size={16} color={COLORS.primary} />
              <Text style={styles.inputLabel}>South African Phone Number</Text>
            </View>
            <TextInput style={styles.authInput} placeholder="Enter your 10-digit phone number" placeholderTextColor="#999"
              value={phone} onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 10))} keyboardType="phone-pad" maxLength={10} />
          </View>
          <View style={styles.inputContainer}>
            <View style={styles.inputLabelRow}>
              <Icon name="lock" size={16} color={COLORS.primary} />
              <Text style={styles.inputLabel}>5-Digit PIN</Text>
            </View>
            <View style={styles.passwordInputContainer}>
              <TextInput style={styles.passwordInput} placeholder="Enter your 5-digit PIN" placeholderTextColor="#999"
                value={pin} onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 5))} secureTextEntry={!showPin} keyboardType="number-pad" maxLength={5} />
              <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPin(!showPin)}>
                <Icon name={showPin ? 'visibility-off' : 'visibility'} size={22} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
          </TouchableOpacity>
        </View>
        <View style={styles.authFooter}>
          <Text style={styles.authFooterText}>Contact your group admin to get access</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
