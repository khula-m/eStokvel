import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  Modal, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Icon } from './Icon';
import { COLORS } from '../constants/theme';
import { styles } from '../styles';

interface PaymentModalProps {
  visible: boolean;
  groupName?: string;
  contributionAmount?: number | string;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  paymentNotes: string;
  setPaymentNotes: (notes: string) => void;
  paying: boolean;
  onConfirm: () => void;
  onClose: () => void;
  formatCurrency: (amount: number | string) => string;
}

const PAYMENT_METHODS_ROW1 = [
  { key: 'EFT', label: 'EFT', icon: 'bank-transfer' },
  { key: 'BANK_TRANSFER', label: 'Bank Transfer', icon: 'bank' },
  { key: 'CARD', label: 'Card', icon: 'credit-card' },
];

const PAYMENT_METHODS_ROW2 = [
  { key: 'OZOW', label: 'Ozow', icon: 'contactless-payment' },
  { key: 'MOBILE_MONEY', label: 'Mobile Money', icon: 'cellphone' },
];

export const PaymentModal = ({
  visible,
  groupName,
  contributionAmount,
  paymentMethod,
  setPaymentMethod,
  paymentNotes,
  setPaymentNotes,
  paying,
  onConfirm,
  onClose,
  formatCurrency,
}: PaymentModalProps) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Icon name="payments" size={24} color={COLORS.primary} />
          <Text style={styles.modalTitle}>Make Payment</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close payment modal" accessibilityRole="button">
            <Icon name="close" size={24} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
        {contributionAmount != null && (
          <>
            <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 14, color: COLORS.textLight }}>Payment Amount</Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: COLORS.primary, marginTop: 4 }}>
                {formatCurrency(contributionAmount)}
              </Text>
              {groupName && (
                <Text style={{ fontSize: 13, color: COLORS.textLight, marginTop: 4 }}>→ {groupName}</Text>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.frequencyRow}>
                {PAYMENT_METHODS_ROW1.map(m => (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.typeBtn, paymentMethod === m.key && styles.typeBtnActive]}
                    onPress={() => setPaymentMethod(m.key)}
                    accessibilityLabel={`Payment method: ${m.label}`}
                    accessibilityRole="button"
                  >
                    <MaterialCommunityIcons name={m.icon as any} size={18} color={paymentMethod === m.key ? '#fff' : COLORS.textLight} />
                    <Text style={[styles.typeBtnText, paymentMethod === m.key && styles.typeBtnTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.frequencyRow, { marginTop: 8 }]}>
                {PAYMENT_METHODS_ROW2.map(m => (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.typeBtn, paymentMethod === m.key && styles.typeBtnActive]}
                    onPress={() => setPaymentMethod(m.key)}
                    accessibilityLabel={`Payment method: ${m.label}`}
                    accessibilityRole="button"
                  >
                    <MaterialCommunityIcons name={m.icon as any} size={18} color={paymentMethod === m.key ? '#fff' : COLORS.textLight} />
                    <Text style={[styles.typeBtnText, paymentMethod === m.key && styles.typeBtnTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={styles.input}
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                placeholder="Add a note..."
                accessibilityLabel="Payment notes"
              />
            </View>
            <TouchableOpacity
              style={[styles.payNowBtn, paying && styles.buttonDisabled]}
              onPress={onConfirm}
              disabled={paying}
              accessibilityLabel="Confirm payment"
              accessibilityRole="button"
            >
              {paying ? <ActivityIndicator color="#fff" /> : (
                <><Icon name="payments" size={20} color="#fff" /><Text style={styles.payNowText}>Confirm Payment</Text></>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  </Modal>
);

export default PaymentModal;
