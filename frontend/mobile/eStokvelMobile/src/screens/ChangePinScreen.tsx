import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { Icon } from '../components/Icon';
import { showAlert } from '../utils/alert';
import { API_URL } from '../constants/config';
import { COLORS } from '../constants/theme';
import { styles } from '../styles';
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
        showAlert('Success', 'Your PIN has been changed successfully.', [{ text: 'OK', onPress: () => onNavigate('main') }]);
      } else { showAlert('Error', response.data.message || 'Failed to change PIN'); }
    } catch (error: any) {
      showAlert('Error', error.response?.data?.message || error.message || 'Failed to change PIN');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
        ...(Platform.OS === 'web' ? { boxShadow: '0 1px 4px rgba(0,0,0,0.04)' } : {}) as any,
      }}>
        <TouchableOpacity
          onPress={() => onNavigate(auth.user?.mustChangePin ? 'landing' : 'main')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingRight: 12 }}
          activeOpacity={0.6}
        >
          <Icon name="arrow-back" size={22} color={COLORS.primary} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary }}>Back</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginRight: 60 }}>
          Change PIN
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.authScrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}><Icon name="lock" size={36} color="#fff" /></View>
          <Text style={styles.logoTitle}>Change Your PIN</Text>
          <Text style={styles.subtitle}>
            {auth.user?.mustChangePin ? 'You must set a new PIN before continuing' : 'Update your 5-digit security PIN'}
          </Text>
        </View>
        <View style={styles.authCard}>
          <View style={styles.inputContainer}>
            <View style={styles.inputLabelRow}><Icon name="lock-outline" size={16} color={COLORS.primary} /><Text style={styles.inputLabel}>Current PIN</Text></View>
            <TextInput style={[styles.authInput, { textAlign: 'center', fontSize: 24, letterSpacing: 12 }]} placeholder="• • • • •" placeholderTextColor="#999"
              value={currentPin} onChangeText={(t) => setCurrentPin(t.replace(/[^0-9]/g, '').slice(0, 5))} keyboardType="number-pad" secureTextEntry maxLength={5} />
          </View>
          <View style={styles.inputContainer}>
            <View style={styles.inputLabelRow}><Icon name="lock" size={16} color={COLORS.primary} /><Text style={styles.inputLabel}>New PIN</Text></View>
            <TextInput style={[styles.authInput, { textAlign: 'center', fontSize: 24, letterSpacing: 12 }]} placeholder="• • • • •" placeholderTextColor="#999"
              value={newPin} onChangeText={(t) => setNewPin(t.replace(/[^0-9]/g, '').slice(0, 5))} keyboardType="number-pad" secureTextEntry maxLength={5} />
          </View>
          <View style={styles.inputContainer}>
            <View style={styles.inputLabelRow}><Icon name="lock" size={16} color={COLORS.primary} /><Text style={styles.inputLabel}>Confirm New PIN</Text></View>
            <TextInput style={[styles.authInput, { textAlign: 'center', fontSize: 24, letterSpacing: 12 }, confirmPin.length === 5 && newPin !== confirmPin && styles.inputError]}
              placeholder="• • • • •" placeholderTextColor="#999" value={confirmPin}
              onChangeText={(t) => setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 5))} keyboardType="number-pad" secureTextEntry maxLength={5} />
            {confirmPin.length === 5 && newPin.length === 5 && (
              <Text style={[styles.validationText, newPin === confirmPin ? styles.validationSuccess : styles.validationError]}>
                {newPin === confirmPin ? '✓ PINs match' : '✗ PINs do not match'}
              </Text>
            )}
          </View>
          <TouchableOpacity style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={handleChangePin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Change PIN</Text>}
          </TouchableOpacity>
        </View>
        <View style={styles.authFooter}>
          <TouchableOpacity onPress={() => onNavigate(auth.user?.mustChangePin ? 'landing' : 'main')}>
            <Text style={styles.authFooterLink}>← {auth.user?.mustChangePin ? 'Back to Login' : 'Back to Dashboard'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
